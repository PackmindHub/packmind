import axios, { AxiosResponse } from 'axios';
import { ApiService } from './ApiService';
import { PackmindError } from './errors/PackmindError';
import { PackmindConflictError } from './errors/PackmindConflictError';

// Mock axios
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

interface MockAxiosInstance {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
  patch: jest.Mock;
}

describe('ApiService', () => {
  let apiService: ApiService;
  let mockAxiosInstance: MockAxiosInstance;
  const testBaseURL = 'http://localhost:3003/api';

  beforeEach(() => {
    // Create a mock axios instance with all the methods we need
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(
      mockAxiosInstance as unknown as ReturnType<typeof axios.create>,
    );

    apiService = new ApiService(testBaseURL);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates axios instance with provided base URL', () => {
      const customBaseURL = 'https://api.example.com/api';
      new ApiService(customBaseURL);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: `${customBaseURL}/v0`,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
    });

    it('appends /api if missing in the endpoint', () => {
      const customBaseURL = 'https://api.example.com';
      new ApiService(customBaseURL);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: `${customBaseURL}/api/v0`,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
    });

    it('creates axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: `${testBaseURL}/v0`,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
    });
  });

  describe('URL versioning', () => {
    it('includes version in base URL during construction', () => {
      const customBaseURL = 'https://api.example.com/api';
      new ApiService(customBaseURL);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: `${customBaseURL}/v0`,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
    });

    it('calls endpoints with clean URLs (version in baseURL)', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockResponse: AxiosResponse = {
        data: mockData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as AxiosResponse['config'],
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await apiService.get('/users');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users', undefined);
    });
  });

  describe('GET requests', () => {
    describe('with successful response', () => {
      const mockData = { id: 1, name: 'Test' };
      let result: typeof mockData;

      beforeEach(async () => {
        const mockResponse: AxiosResponse = {
          data: mockData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosResponse['config'],
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);
        result = await apiService.get('/users');
      });

      it('calls axios get with correct endpoint', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users', undefined);
      });

      it('returns response data', () => {
        expect(result).toEqual(mockData);
      });
    });

    describe('with config parameter', () => {
      const mockData = { id: 1, name: 'Test' };
      const config = { params: { page: 1 } };
      let result: typeof mockData;

      beforeEach(async () => {
        const mockResponse: AxiosResponse = {
          data: mockData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosResponse['config'],
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);
        result = await apiService.get('/users', config);
      });

      it('calls axios get with config', () => {
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users', config);
      });

      it('returns response data', () => {
        expect(result).toEqual(mockData);
      });
    });

    it('throws error on request failure', async () => {
      const mockError = {
        response: {
          data: { message: 'Internal Server Error' },
          status: 500,
          statusText: 'Internal Server Error',
        },
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(apiService.get('/users')).rejects.toThrow(
        'Internal Server Error',
      );
    });
  });

  describe('POST requests', () => {
    describe('with successful response', () => {
      const postData = { name: 'New User' };
      const mockResponseData = { id: 1, name: 'New User' };
      let result: typeof mockResponseData;

      beforeEach(async () => {
        const mockResponse: AxiosResponse = {
          data: mockResponseData,
          status: 201,
          statusText: 'Created',
          headers: {},
          config: {} as AxiosResponse['config'],
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        result = await apiService.post('/users', postData);
      });

      it('calls axios post with correct endpoint and data', () => {
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/users',
          postData,
          undefined,
        );
      });

      it('returns response data', () => {
        expect(result).toEqual(mockResponseData);
      });
    });

    it('throws error on request failure', async () => {
      const postData = { name: 'New User' };
      const mockError = {
        response: {
          data: { message: 'Bad Request' },
          status: 400,
          statusText: 'Bad Request',
        },
      };

      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(apiService.post('/users', postData)).rejects.toThrow(
        'Bad Request',
      );
    });
  });

  describe('PUT requests', () => {
    describe('with successful response', () => {
      const putData = { id: 1, name: 'Updated User' };
      let result: typeof putData;

      beforeEach(async () => {
        const mockResponse: AxiosResponse = {
          data: putData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosResponse['config'],
        };

        mockAxiosInstance.put.mockResolvedValue(mockResponse);
        result = await apiService.put('/users/1', putData);
      });

      it('calls axios put with correct endpoint and data', () => {
        expect(mockAxiosInstance.put).toHaveBeenCalledWith(
          '/users/1',
          putData,
          undefined,
        );
      });

      it('returns response data', () => {
        expect(result).toEqual(putData);
      });
    });
  });

  describe('DELETE requests', () => {
    describe('with successful response', () => {
      const mockResponseData = { message: 'User deleted' };
      let result: typeof mockResponseData;

      beforeEach(async () => {
        const mockResponse: AxiosResponse = {
          data: mockResponseData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosResponse['config'],
        };

        mockAxiosInstance.delete.mockResolvedValue(mockResponse);
        result = await apiService.delete('/users/1');
      });

      it('calls axios delete with correct endpoint', () => {
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
          '/users/1',
          undefined,
        );
      });

      it('returns response data', () => {
        expect(result).toEqual(mockResponseData);
      });
    });
  });

  describe('PATCH requests', () => {
    describe('with successful response', () => {
      const patchData = { name: 'Patched User' };
      const mockResponseData = { id: 1, name: 'Patched User' };
      let result: typeof mockResponseData;

      beforeEach(async () => {
        const mockResponse: AxiosResponse = {
          data: mockResponseData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosResponse['config'],
        };

        mockAxiosInstance.patch.mockResolvedValue(mockResponse);
        result = await apiService.patch('/users/1', patchData);
      });

      it('calls axios patch with correct endpoint and data', () => {
        expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
          '/users/1',
          patchData,
          undefined,
        );
      });

      it('returns response data', () => {
        expect(result).toEqual(mockResponseData);
      });
    });
  });

  describe('Error handling', () => {
    it('handles network errors', async () => {
      const mockError = {
        request: {},
        message: 'Network Error',
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(apiService.get('/users')).rejects.toThrow(
        'Network Error: No response from server',
      );
    });

    it('handles generic request errors', async () => {
      const mockError = new Error('Generic error');

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(apiService.get('/users')).rejects.toThrow(
        'Request Error: Generic error',
      );
    });

    describe('when data.message is available', () => {
      const error = {
        response: {
          data: {
            message: 'Some custom error',
          },
          statusText: "I'm a teapot",
          status: 418,
        },
      };

      it('throws a PackmindError', async () => {
        mockAxiosInstance.get.mockRejectedValue(error);

        await expect(apiService.get('/users')).rejects.toThrow(
          new PackmindError(error.response),
        );
      });

      it('rejects with PackmindConflictError is status is 409', async () => {
        const conflictError = {
          response: {
            ...error.response,
            status: 409,
          },
        };
        mockAxiosInstance.get.mockRejectedValue(conflictError);

        await expect(apiService.get('/users')).rejects.toThrow(
          new PackmindConflictError(conflictError.response),
        );
      });
    });

    it('handles errors without response data', async () => {
      const mockError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        },
      };

      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(apiService.get('/users')).rejects.toThrow(
        'API Error: Internal Server Error',
      );
    });
  });

  describe('TypeScript generics', () => {
    interface User {
      id: number;
      name: string;
      email: string;
    }

    describe('with typed response', () => {
      const mockUser: User = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      };
      let result: User;

      beforeEach(async () => {
        const mockResponse: AxiosResponse = {
          data: mockUser,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as AxiosResponse['config'],
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);
        result = await apiService.get<User>('/users/1');
      });

      it('returns correctly typed response', () => {
        expect(result).toEqual(mockUser);
      });

      it('provides access to id property', () => {
        expect(result.id).toBe(1);
      });

      it('provides access to name property', () => {
        expect(result.name).toBe('Test User');
      });

      it('provides access to email property', () => {
        expect(result.email).toBe('test@example.com');
      });
    });
  });

  describe('getAxiosInstance', () => {
    it('returns the internal axios instance', () => {
      const axiosInstance = apiService.getAxiosInstance();

      expect(axiosInstance).toBeDefined();
    });
  });
});
