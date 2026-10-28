import { lazy, Suspense, useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import { theme } from './theme';
import GraphPage from './GraphPage';
import DocsPage from './docs/DocsPage';
import { HOME_DOC } from './docs/content';
import './docs/markdown.css';

// 图表库只在洞察页和演进页用到，单独拆包；差距追踪页同样按需加载
const TimelinePage = lazy(() => import('./timeline/TimelinePage'));
const InsightsPage = lazy(() => import('./insights/InsightsPage'));
const GapsPage = lazy(() => import('./gaps/GapsPage'));
const SuggestionsPage = lazy(() => import('./suggestions/SuggestionsPage'));
const StatsPage = lazy(() => import('./stats/StatsPage'));

type Route =
  | { view: 'graph' }
  | { view: 'insights' }
  | { view: 'gaps' }
  | { view: 'suggestions' }
  | { view: 'stats' }
  | { view: 'timeline' }
  | { view: 'doc'; path: string; anchor?: string };

// hash 路由：GitHub Pages 没有路径回退规则，hash 不依赖服务端
function parseHash(hash: string): Route {
  if (hash.startsWith('#/graph')) return { view: 'graph' };
  if (hash.startsWith('#/insights')) return { view: 'insights' };
  if (hash.startsWith('#/gaps')) return { view: 'gaps' };
  if (hash.startsWith('#/suggestions')) return { view: 'suggestions' };
  if (hash.startsWith('#/stats')) return { view: 'stats' };
  if (hash.startsWith('#/timeline')) return { view: 'timeline' };
  const m = hash.match(/^#\/doc\/([^?]+)(?:\?a=(.*))?$/);
  if (m) return { view: 'doc', path: decodeURIComponent(m[1]), anchor: m[2] ? decodeURIComponent(m[2]) : undefined };
  return { view: 'doc', path: HOME_DOC };
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
          <Typography sx={{ fontWeight: 700, mr: 3 }}>Mindforge</Typography>
          <Tabs value={route.view} sx={{ minHeight: 44, '& .MuiTab-root': { minHeight: 44 } }}>
            <Tab value="doc" label="文章导航" component="a" href={`#/doc/${HOME_DOC}`} />
            <Tab value="graph" label="知识图谱" component="a" href="#/graph" />
            <Tab value="insights" label="洞察" component="a" href="#/insights" />
            <Tab value="gaps" label="差距追踪" component="a" href="#/gaps" />
            <Tab value="suggestions" label="建议" component="a" href="#/suggestions" />
            <Tab value="stats" label="统计" component="a" href="#/stats" />
            <Tab value="timeline" label="演进" component="a" href="#/timeline" />
          </Tabs>
        </Box>
        {route.view === 'graph' && <GraphPage />}
        {route.view === 'insights' && (
          <Suspense fallback={null}>
            <InsightsPage />
          </Suspense>
        )}
        {route.view === 'gaps' && (
          <Suspense fallback={null}>
            <GapsPage />
          </Suspense>
        )}
        {route.view === 'stats' && (
          <Suspense fallback={null}>
            <StatsPage />
          </Suspense>
        )}
        {route.view === 'suggestions' && (
          <Suspense fallback={null}>
            <SuggestionsPage />
          </Suspense>
        )}
        {route.view === 'timeline' && (
          <Suspense fallback={null}>
            <TimelinePage />
          </Suspense>
        )}
        {route.view === 'doc' && <DocsPage path={route.path} anchor={route.anchor} />}
      </Box>
    </ThemeProvider>
  );
}
