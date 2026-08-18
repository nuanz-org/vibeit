"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
  listMyTools,
  type OwnerToolKind,
} from "@/lib/api/tools";

export const MY_TOOLS_PAGE_SIZE = 24;

export function myToolsQueryKey(kind: OwnerToolKind) {
  return ["my-tools", kind] as const;
}

export function useMyTools(kind: OwnerToolKind) {
  return useInfiniteQuery({
    queryKey: myToolsQueryKey(kind),
    queryFn: ({ pageParam }) =>
      listMyTools({
        limit: MY_TOOLS_PAGE_SIZE,
        offset: pageParam,
        kind,
      }),
    initialPageParam: 0,
    getNextPageParam: (last, _pages, lastPageParam) =>
      last.hasMore ? lastPageParam + MY_TOOLS_PAGE_SIZE : undefined,
    retry: 1,
  });
}
