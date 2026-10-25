# API-COMMENT-001-GET-api-dossiers-id-comments Detail Design

## 1. Tong quan

| Truong | Gia tri |
| --- | --- |
| Task ID | Sky-Lux-086 |
| Level 1 | API Comments (MOD-COMMENT) |
| Level 2 | API-COMMENT-001-GET-api-dossiers-id-comments |
| Method | GET |
| Endpoint | `/api/dossiers/:id/comments` |
| Phase | Phase 1 |
| Muc tieu | Lay danh sach binh luan cua mot ho so |

## 2. Authorization

- Can JWT access token hop le.
- User can co mot trong cac permission: `dossier.view.own`, `dossier.view.team`, `dossier.view.all`.
- `dossier.view.own`: duoc xem dossier do user tao, duoc gan lam sales, hoac duoc gan lam operator.
- `dossier.view.team`: duoc xem dossier co sales/operator cung `departmentId` voi user.
- `dossier.view.all`, `*`, hoac role admin: duoc xem moi dossier trong cung organization.
- Backend lay `organizationId` tu authenticated user; client khong duoc tu truyen tenant scope.
- Dossier khong ton tai trong organization hoac nam ngoai pham vi quyen tra ve `404`.

## 3. Query DTO

Class: `QueryCommentDto`

| Field | Type | Required | Default | Rule |
| --- | --- | --- | --- | --- |
| `page` | number | No | 1 | Integer, min 1 |
| `pageSize` | number | No | 50 | Integer, min 1, max 100 |
| `search` | string | No | - | Tim trong noi dung comment |

Khong co request body.

## 4. Response

HTTP response duoc boc boi global response interceptor:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": [
    {
      "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "organizationId": "org-uuid",
      "dossierId": "dossier-uuid",
      "userId": "user-uuid",
      "content": "Khach hang yeu cau doi lich bay",
      "parentId": null,
      "createdAt": "2026-08-24T00:00:00.000Z",
      "updatedAt": "2026-08-24T00:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "fullName": "Nguyen Van A",
        "email": "a@example.com",
        "avatarUrl": null
      }
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 1,
    "totalPages": 1
  },
  "timestamp": "2026-08-31T00:00:00.000Z"
}
```

Khong expose `passwordHash`, refresh token, relation entity, hoac field noi bo khac cua user/comment. Frontend `apiClient` unwrap response thanh `{ data, meta }`.

## 5. Business rules

- Chi lay comment co cung `dossierId` va `organizationId` voi request.
- Sap xep theo `createdAt ASC` de hien thi theo thu tu trao doi.
- `search` duoc ap dung tren `comment.content`.
- Comment da soft-delete khong duoc tra ve boi TypeORM default scope.
- Endpoint khong cache mac dinh. Neu them cache, cache key phai bao gom organization, dossier, user scope va query.

## 6. Error handling

- `400`: query khong hop le, vi du `pageSize > 100`.
- `401`: thieu hoac sai JWT.
- `403`: user khong co permission xem dossier.
- `404`: dossier khong ton tai, khac organization, hoac nam ngoai pham vi own/team.

## 7. Test checklist

- Query defaults va gioi han `page/pageSize`.
- Filter search va pagination metadata.
- Isolation giua cac organization.
- Own/team/all permission scope.
- Khong expose thong tin nhay cam cua user.
- Response HTTP co dang `{ success, statusCode, data, meta, timestamp }`.
