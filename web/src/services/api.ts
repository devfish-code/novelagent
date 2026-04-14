/**
 * API Client Configuration
 * 配置 Axios 客户端和拦截器
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiError } from '../types';

// API 基础 URL
const API_BASE_URL = '/api';

// 创建 Axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证 token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<{ success: false; error: ApiError }>) => {
    // 处理错误响应
    if (error.response) {
      // 服务器返回错误响应
      const apiError = error.response.data?.error;
      if (apiError) {
        // 返回标准化的错误对象
        return Promise.reject({
          code: apiError.code,
          message: apiError.message,
          details: apiError.details,
          status: error.response.status,
        });
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      return Promise.reject({
        code: 'NETWORK_ERROR',
        message: '网络错误，请检查您的网络连接',
        status: 0,
      });
    }
    
    // 其他错误
    return Promise.reject({
      code: 'UNKNOWN_ERROR',
      message: error.message || '未知错误',
      status: 0,
    });
  }
);

// 导出 API 客户端
export default apiClient;

// 导出便捷方法
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
  
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),
};
