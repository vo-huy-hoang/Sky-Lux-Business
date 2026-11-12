import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { derivePurposeSecret } from '../../common/utils/jwt-purpose.util';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

describe('StorageService & StorageController (Ticket 03)', () => {
  const jwtMasterSecret = 'super-secret-jwt-key-minimum-16-chars';
  let tempUploadDir: string;
  let storageService: StorageService;
  let controller: StorageController;

  const orgAUser: CurrentUserPayload = {
    id: 'user-a',
    organizationId: 'org-a',
    employeeCode: 'EMP-A',
    fullName: 'User A',
    email: 'a@skylux.vn',
    roles: ['SALES'],
    permissions: ['chat.access', 'document.view'],
  };

  const orgBUser: CurrentUserPayload = {
    ...orgAUser,
    id: 'user-b',
    organizationId: 'org-b',
  };

  const createLocalConfigService = (uploadDir: string) =>
    ({
      get: jest.fn((key: string) => {
        if (key === 'storage.uploadDir') return uploadDir;
        if (key === 'JWT_SECRET' || key === 'app.jwtSecret')
          return jwtMasterSecret;
        return undefined;
      }),
    }) as unknown as ConfigService;

  beforeEach(() => {
    tempUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skylux-storage-'));
    storageService = new StorageService(
      createLocalConfigService(tempUploadDir),
      new JwtService(),
    );
    controller = new StorageController(storageService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tempUploadDir, { recursive: true, force: true });
  });

  describe('Allowlist & Magic-Byte Validation', () => {
    it('accepts valid PNG, JPEG, PDF, and XLSX files matching magic bytes', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
      ]);
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const pdfBuffer = Buffer.from('%PDF-1.4\n%ValidPDF');
      const xlsxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

      await expect(
        storageService.uploadFile(
          {
            buffer: pngBuffer,
            originalname: 'passport.png',
            mimetype: 'image/png',
          },
          'org-a/chat/2026/11/passport.png',
          'chat',
        ),
      ).resolves.toMatchObject({ objectKey: 'org-a/chat/2026/11/passport.png' });

      await expect(
        storageService.uploadFile(
          {
            buffer: jpegBuffer,
            originalname: 'ticket.jpg',
            mimetype: 'image/jpeg',
          },
          'org-a/chat/2026/11/ticket.jpg',
          'chat',
        ),
      ).resolves.toMatchObject({ objectKey: 'org-a/chat/2026/11/ticket.jpg' });

      await expect(
        storageService.uploadFile(
          {
            buffer: pdfBuffer,
            originalname: 'contract.pdf',
            mimetype: 'application/pdf',
          },
          'organizations/org-a/dossiers/d-1/contract.pdf',
          'document',
        ),
      ).resolves.toMatchObject({
        objectKey: 'organizations/org-a/dossiers/d-1/contract.pdf',
      });

      expect(() =>
        storageService.validateUpload(
          {
            buffer: xlsxBuffer,
            originalname: 'budget.xlsx',
            mimetype:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          'import',
        ),
      ).not.toThrow();
    });

    it('rejects .svg, .html, .xml, and disguised PNG/XLSX payloads across policies', async () => {
      await expect(
        storageService.uploadFile(
          {
            buffer: Buffer.from('<svg onload="alert(1)"></svg>'),
            originalname: 'vector.svg',
            mimetype: 'image/svg+xml',
          },
          'org-a/chat/vector.svg',
          'chat',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        storageService.uploadFile(
          {
            buffer: Buffer.from('<html><script>alert(1)</script></html>'),
            originalname: 'fake.png',
            mimetype: 'image/png',
          },
          'org-a/chat/fake.png',
          'chat',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(() =>
        storageService.validateUpload(
          {
            buffer: Buffer.from('<?xml version="1.0"?><workbook/>'),
            originalname: 'budget.xlsx',
            mimetype:
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          'import',
        ),
      ).toThrow(BadRequestException);

      expect(() =>
        storageService.validateUpload(
          {
            buffer: Buffer.from('<html><body>xss</body></html>'),
            originalname: 'leads.csv',
            mimetype: 'text/csv',
          },
          'import',
        ),
      ).toThrow(BadRequestException);
    });

    it('blocks path traversal attempts in object keys', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);

      await expect(
        storageService.uploadFile(
          {
            buffer: pngBuffer,
            originalname: 'escape.png',
            mimetype: 'image/png',
          },
          'org-a/../../etc/passwd.png',
          'chat',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Purpose-Bound Download Tokens & Authorized Delivery', () => {
    it('serves signed document downloads to same-org user with nosniff and rejects cross-org & mismatched token secrets', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%Contract');
      const objectKey = 'organizations/org-a/dossiers/dos-1/contract.pdf';
      await storageService.uploadFile(
        {
          buffer: pdfBuffer,
          originalname: 'contract.pdf',
          mimetype: 'application/pdf',
        },
        objectKey,
        'document',
      );

      const signedPath = await storageService.getSignedDownloadUrl(
        objectKey,
        'contract.pdf',
        600,
        'org-a',
      );
      expect(signedPath).toMatch(/^\/api\/files\/download\?token=/);

      const token = new URL(`http://localhost${signedPath}`).searchParams.get(
        'token',
      )!;

      // Cross-purpose check: signing with "access" secret must NOT verify as "file-download"
      const wrongPurposeToken = await new JwtService().signAsync(
        { objectKey, organizationId: 'org-a', purpose: 'file-download' },
        { secret: derivePurposeSecret(jwtMasterSecret, 'access') },
      );
      await expect(
        storageService.verifyDownloadToken(wrongPurposeToken),
      ).rejects.toThrow(UnauthorizedException);

      // Cross-org access denied
      const resDenied = {
        setHeader: jest.fn(),
        sendFile: jest.fn(),
        redirect: jest.fn(),
      } as any;
      await expect(
        controller.downloadByToken(orgBUser, token, undefined, resDenied),
      ).rejects.toThrow(ForbiddenException);

      // Same-org download succeeds with security headers
      const resAllowed = {
        setHeader: jest.fn(),
        sendFile: jest.fn(),
        redirect: jest.fn(),
      } as any;
      await controller.downloadByToken(orgAUser, token, 'true', resAllowed);

      expect(resAllowed.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
      expect(resAllowed.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment;'),
      );
      expect(resAllowed.sendFile).toHaveBeenCalledWith(
        expect.stringContaining('contract.pdf'),
      );
    });

    it('serves chat raster images inline for same-org user and rejects cross-org chat key', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]);
      const chatKey = 'org-a/chat/2026/11/ticket.png';
      await storageService.uploadFile(
        {
          buffer: pngBuffer,
          originalname: 'ticket.png',
          mimetype: 'image/png',
        },
        chatKey,
        'chat',
      );

      const resDenied = { setHeader: jest.fn(), sendFile: jest.fn() } as any;
      await expect(
        controller.getChatAttachment(orgBUser, chatKey, undefined, resDenied),
      ).rejects.toThrow(ForbiddenException);

      const resAllowed = { setHeader: jest.fn(), sendFile: jest.fn() } as any;
      await controller.getChatAttachment(
        orgAUser,
        chatKey,
        undefined,
        resAllowed,
      );

      expect(resAllowed.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff',
      );
      expect(resAllowed.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('inline;'),
      );
      expect(resAllowed.sendFile).toHaveBeenCalled();
    });

    it('blocks same-org users who are not conversation participants or pre-send uploaders from accessing /api/files/chat', async () => {
      const mockDataSource = {
        query: jest.fn(),
      } as any;
      const guardedController = new StorageController(
        storageService,
        mockDataSource,
      );

      const chatKey = 'org-a/chat/2026/11/user-uploader/secret-chat.png';
      await storageService.uploadFile(
        {
          buffer: Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
          ]),
          originalname: 'secret-chat.png',
          mimetype: 'image/png',
        },
        chatKey,
        'chat',
      );

      // Case 1: Linked to message in conversation where requester is NOT a member
      mockDataSource.query.mockResolvedValueOnce([{ is_member: false }]);
      await expect(
        guardedController.getChatAttachment(
          { id: 'colleague-not-member', organizationId: 'org-a' } as any,
          chatKey,
          undefined,
          { setHeader: jest.fn(), sendFile: jest.fn() } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      // Case 2: Linked to message where requester IS a member -> allowed
      mockDataSource.query.mockResolvedValueOnce([{ is_member: true }]);
      const okRes = { setHeader: jest.fn(), sendFile: jest.fn() } as any;
      await guardedController.getChatAttachment(
        { id: 'member-2', organizationId: 'org-a' } as any,
        chatKey,
        undefined,
        okRes,
      );
      expect(okRes.sendFile).toHaveBeenCalled();

      // Case 3: Pending pre-send upload -> blocked for other user, allowed for uploader
      mockDataSource.query.mockResolvedValue([]);
      await expect(
        guardedController.getChatAttachment(
          { id: 'other-user', organizationId: 'org-a' } as any,
          chatKey,
          undefined,
          { setHeader: jest.fn(), sendFile: jest.fn() } as any,
        ),
      ).rejects.toThrow(ForbiddenException);

      const uploaderRes = { setHeader: jest.fn(), sendFile: jest.fn() } as any;
      await guardedController.getChatAttachment(
        { id: 'user-uploader', organizationId: 'org-a' } as any,
        chatKey,
        undefined,
        uploaderRes,
      );
      expect(uploaderRes.sendFile).toHaveBeenCalled();
    });
  });

  describe('Cloudinary Authenticated Mode', () => {
    it('uploads and signs downloads using type=authenticated rather than public upload', async () => {
      const cloudinaryConfig = {
        get: jest.fn((key: string) => {
          if (key === 'storage.cloudName') return 'demo-cloud';
          if (key === 'storage.apiKey') return 'demo-key';
          if (key === 'storage.apiSecret') return 'demo-secret';
          if (key === 'storage.folder') return 'skylux';
          if (key === 'storage.uploadDir') return tempUploadDir;
          if (key === 'JWT_SECRET' || key === 'app.jwtSecret')
            return jwtMasterSecret;
          return undefined;
        }),
      } as unknown as ConfigService;

      const cloudStorage = new StorageService(
        cloudinaryConfig,
        new JwtService(),
      );
      const fetchMock = jest
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            secure_url: 'https://res.cloudinary.com/demo/authenticated/doc.pdf',
            public_id: 'skylux/org-a/doc.pdf',
            resource_type: 'raw',
          }),
        } as any);

      const uploadResult = await cloudStorage.uploadFile(
        {
          buffer: Buffer.from('%PDF-1.4\n%Cloud'),
          originalname: 'doc.pdf',
          mimetype: 'application/pdf',
        },
        'organizations/org-a/dossiers/d-1/doc.pdf',
        'document',
      );

      const uploadForm = fetchMock.mock.calls[0][1]?.body as FormData;
      expect(uploadForm.get('type')).toBe('authenticated');
      expect(uploadResult.publicUrl).toBeUndefined();

      const signedUrl = await cloudStorage.getSignedDownloadUrl(
        'organizations/org-a/dossiers/d-1/doc.pdf',
        'doc.pdf',
        300,
        'org-a',
      );
      expect(signedUrl).toContain('type=authenticated');
      expect(signedUrl).toContain('signature=');

      const signedImageUrl = await cloudStorage.getSignedDownloadUrl(
        'organizations/org-a/dossiers/d-1/photo.png',
        'photo.png',
        300,
        'org-a',
      );
      expect(signedImageUrl).toContain('format=png');
    });
  });
});

