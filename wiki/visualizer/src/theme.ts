import { createTheme } from '@mui/material/styles';

export const NODE_COLORS: Record<string, string> = {
  concept: '#4A90D9',
  method: '#50C878',
  decision: '#FF8C42',
};

export const RELATION_COLORS: Record<string, string> = {
  implements: '#E74C3C',
  grounds: '#9B59B6',
  extends: '#3498DB',
  constrains: '#E67E22',
  contrasts: '#1ABC9C',
  'part-of': '#F39C12',
  uses: '#2ECC71',
  produces: '#8E44AD',
  addresses: '#16A085',
  untyped: '#95A5A6',
};

export const NODE_SIZE_MIN = 4;
export const NODE_SIZE_MAX = 20;

export function getNodeSize(claimsCount: number, minCount: number, maxCount: number): number {
  if (maxCount === minCount) return (NODE_SIZE_MIN + NODE_SIZE_MAX) / 2;
  const ratio = (claimsCount - minCount) / (maxCount - minCount);
  return NODE_SIZE_MIN + ratio * (NODE_SIZE_MAX - NODE_SIZE_MIN);
}

export const NODE_TYPE_LABELS: Record<string, string> = {
  concept: '概念',
  method: '方法',
  decision: '决策',
};

export const RELATION_TYPE_LABELS: Record<string, string> = {
  implements: '实现',
  grounds: '基础',
  extends: '扩展',
  constrains: '约束',
  contrasts: '对比',
  'part-of': '部分',
  uses: '使用',
  produces: '产出',
  addresses: '解决',
  untyped: '未分类',
};

export const theme = createTheme({
  palette: {
    primary: { main: '#1a237e' },
    secondary: { main: '#ff8c42' },
    background: { default: '#fafafa' },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Noto Sans SC"',
      'sans-serif',
    ].join(','),
  },
});
