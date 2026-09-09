# API-COMMENT-002-POST-api-dossiers-id-comments Detail Design

## 1. Tong quan

| Truong | Gia tri |
| --- | --- |
| Task ID | Sky-Lux-087 |
| Level 1 | API Comments (MOD-COMMENT) |
| Level 2 | API-COMMENT-002-POST-api-dossiers-id-comments |
| Method | POST |
| Endpoint | `/api/dossiers/:id/comments` |
| Phase | Phase 1 |
| Muc tieu | Tao binh luan hoac tra loi trong mot ho so |

## 2. Authorization

- Can JWT access token hop le.
- Can permission `dossier.update`.
- Ngoai permission tren, dossier van phai nam trong pham vi `dossier.view.own`, `dossier.view.team`, `dossier.view.all`, `*`, hoac admin role cua user.
- Backend lay `organizationId` va `userId` tu authenticated user; client khong duoc tu truyen hai gia tri nay.
- Dossier khong ton tai trong organization hoac nam ngoai pham vi quyen tra ve `404`.

## 3. Request

### Path

- `id`: UUID cua dossier, bat buoc.

### Body DTO: `CreateCommentDto`

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| `content` | string | Yes | Trim dau/cuoi, khong rong, toi da 5000 ky tu |
| `parentId` | UUID v4 | No | Phai la comment thuoc cung dossier va organization |

Example:

```json
{
  "content": "Khach hang yeu cau doi lich bay sang ngay mai",
  "parentId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
}
```

## 4. Response

HTTP status: `201 Created`.

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Operation successful",
  "data": {
    "id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
    "organizationId": "org-uuid",
    "dossierId": "dossier-uuid",
    "userId": "user-uuid",
    "content": "Khach hang yeu cau doi lich bay sang ngay mai",
    "parentId": null,
    "createdAt": "2026-08-31T00:00:00.000Z",
    "updatedAt": "2026-08-31T00:00:00.000Z",
    "user": {
      "id": "user-uuid",
      "fullName": "Nguyen Van A",
      "email": "a@example.com",
      "avatarUrl": null
    }
  },
  "timestamp": "2026-08-31T00:00:00.000Z"
}
```

Khong expose `passwordHash`, refresh token, relation entity, hoac field noi bo khac. Frontend `apiClient` unwrap response thanh mot `DossierComment`.

## 5. Business rules

- Tao comment voi `organizationId`, `dossierId`, `userId` tu server.
- Noi dung duoc trim truoc khi luu.
- Khong cho tao comment khi dossier co status `LOCKED`.
- Neu co `parentId`, comment cha phai ton tai trong cung dossier va organization.
- Khong cache response ghi. Neu he thong co cache danh sach comment, can invalidate sau khi tao thanh cong.

## 6. Error handling

- `400`: body khong hop le, content rong/toan khoang trang, content qua 5000 ky tu, hoac dossier da `LOCKED`.
- `401`: thieu hoac sai JWT.
- `403`: thieu `dossier.update` hoac khong co quyen xem dossier trong scope.
- `404`: dossier khong ton tai/khac organization/ngoai scope, hoac `parentId` khong hop le.

## 7. Test checklist

- Tao comment thuong va tao reply.
- Trim content va tu choi content toan khoang trang.
- Tu choi body co field la.
- Tu choi parent comment khac dossier/organization.
- Tu choi dossier `LOCKED`.
- Kiem tra `dossier.update` va own/team/all scope.
- Khong expose thong tin nhay cam cua user.
