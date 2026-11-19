

import {RedisService } from ".";
export const cacheWrapper = async <T>(
  {key, ttlSeconds=1500}: {key: string, ttlSeconds?: number},
  cb: () => Promise<T>
): Promise<T> => {
  const cached = await RedisService.get(key);
  if (cached) {
    console.log("✔ using cache:", key);
    return cached as T;
  }
  
  console.log("✖ no cache → fetching DB:", key);
  const data = await cb();

   await RedisService.set({key, value:data, ttl:ttlSeconds});

  return data;
};
/* example 
 const getUser = async (userId: string) => {
  return cacheWrapper(
    { key: `user:${userId}`, ttlSeconds: 600 },
    async () => {
      return await User.findById(userId);
    }
  );
};
*/

