import { useEffect, useCallback } from 'react';

interface InfiniteScrollProps {
  hasMore: boolean;
  loading: boolean;
  threshold?: number;
  onLoadMore: () => void;
}

export const useInfiniteScroll = ({
  hasMore,
  loading,
  threshold = 200,
  onLoadMore,
}: InfiniteScrollProps) => {
  const handleScroll = useCallback(() => {
    if (loading || !hasMore) return;

    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || window.innerHeight;

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      onLoadMore();
    }
  }, [loading, hasMore, threshold, onLoadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return null;
};