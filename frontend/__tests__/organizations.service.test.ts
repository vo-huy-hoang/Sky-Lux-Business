import { apiClient } from '@/lib/api-client';
import { organizationsService } from '@/services/organizations.service';

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

describe('OrganizationsService', () => {
  it('uses the backend settings map contract', async () => {
    const settings = { 'import.encoding': 'UTF-8' };
    (apiClient.get as jest.Mock).mockResolvedValueOnce(settings);

    const result = await organizationsService.getSettings();

    expect(result).toEqual(settings);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/organization/settings',
      expect.anything(),
    );
  });
});
