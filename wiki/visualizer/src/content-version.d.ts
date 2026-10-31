// vite.config.ts 在构建时注入：内容同步时间，用来让内容请求绕过按路径的缓存
declare const __CONTENT_VERSION__: string;
