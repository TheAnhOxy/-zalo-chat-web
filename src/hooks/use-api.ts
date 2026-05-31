"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/src/services/api/client";
import { AxiosRequestConfig } from "axios";

/**
 * Custom Hook chung để thực hiện gọi API GET (fetch dữ liệu).
 * 
 * @param urlOrFetchFn Đường dẫn API (ví dụ: "/users") HOẶC một hàm fetch tuỳ chỉnh trả về Promise
 * @param queryKey Mảng key định danh cho React Query (ví dụ: ["users", "list"])
 * @param config Cấu hình thêm của Axios (ví dụ: params, headers)
 * @param options Cấu hình thêm của React Query (ví dụ: enabled, staleTime)
 */
export function useApiQuery<TData = any>(
  urlOrFetchFn: string | (() => Promise<TData>),
  queryKey: any[],
  config?: AxiosRequestConfig,
  options?: any
) {
  return useQuery<TData, Error>({
    queryKey,
    queryFn: async () => {
      if (typeof urlOrFetchFn === "string") {
        const response = await apiClient.get<TData>(urlOrFetchFn, config);
        return response.data;
      }
      return urlOrFetchFn();
    },
    ...options,
  });
}

/**
 * Custom Hook chung để thực hiện gọi API POST/PUT/PATCH/DELETE (thay đổi dữ liệu).
 * 
 * @param urlOrFn Đường dẫn API gốc HOẶC một hàm nhận vào variables và trả về URL động (ví dụ: (vars) => `/users/${vars.id}`)
 * @param method Phương thức HTTP (mặc định là "post")
 * @param options Cấu hình thêm của React Query (ví dụ: onSuccess, onError)
 */
export function useApiMutation<TVariables = any, TData = any>(
  urlOrFn: string | ((variables: TVariables) => string),
  method: "post" | "put" | "patch" | "delete" = "post",
  options?: any
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const url = typeof urlOrFn === "string" ? urlOrFn : urlOrFn(variables);
      
      let response;
      if (method === "delete") {
        response = await apiClient.delete<TData>(url, { data: variables });
      } else {
        response = await apiClient[method]<TData>(url, variables);
      }
      return response.data;
    },
    ...options,
  });
}
