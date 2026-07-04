declare module 'd3-force-3d' {
  // react-force-graph-2d 内部用 d3-force-3d 做力学模拟；此处仅声明我们用到的 forceCollide。
  // 力对象既是可调用的 ForceFn（供 d3Force 装载），又带链式配置方法，故用交叉类型自引用。
  interface ForceCollide<T> {
    (alpha: number): void;
    initialize(nodes: T[]): void;
    radius(r: number | ((node: T, i: number, nodes: T[]) => number)): ForceCollide<T>;
    strength(s: number): ForceCollide<T>;
    iterations(n: number): ForceCollide<T>;
  }

  export function forceCollide<T = unknown>(
    radius?: number | ((node: T, i: number, nodes: T[]) => number)
  ): ForceCollide<T>;
}
