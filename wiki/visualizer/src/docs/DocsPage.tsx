import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import DocView from './DocView';
import DocTree from './DocTree';
import ListSubheader from '@mui/material/ListSubheader';
import { docHash, HOME_DOC, useContentIndex } from './content';
import type { ContentIndex } from './content';
import { useReading } from './readingState';
import type { Snapshot } from './readingState';

interface DocsPageProps {
  path: string;
  anchor?: string;
}

const MAX_RESULTS = 60;
const RECENT = 5;

function Personal({ index, path, reading }: { index: ContentIndex; path: string; reading: Snapshot }) {
  const rows = [...reading.states.entries()].filter(([p]) => index.byPath.has(p) && p !== HOME_DOC);
  const favorites = rows.filter(([, s]) => s.favorite).sort((a, b) => b[1].lastReadAt.localeCompare(a[1].lastReadAt));
  const recent = rows.filter(([, s]) => s.lastReadAt).sort((a, b) => b[1].lastReadAt.localeCompare(a[1].lastReadAt)).slice(0, RECENT);
  const item = ([p, s]: (typeof rows)[number]) => (
    <ListItemButton key={p} component="a" href={docHash(p)} selected={p === path} sx={{ py: 0.25 }}>
      <ListItemText
        primary={index.byPath.get(p)!.title}
        secondary={s.scroll >= 0.02 ? `读到 ${Math.round(s.scroll * 100)}%` : undefined}
        slotProps={{ primary: { noWrap: true, sx: { fontSize: 13 } }, secondary: { sx: { fontSize: 11 } } }}
      />
    </ListItemButton>
  );
  return (
    <>
      {favorites.length > 0 && <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'background.default' }}>我的收藏 · {favorites.length}</ListSubheader>}
      {favorites.map(item)}
      {recent.length > 0 && <ListSubheader sx={{ lineHeight: '32px', bgcolor: 'background.default' }}>最近阅读</ListSubheader>}
      {recent.map(item)}
    </>
  );
}

export default function DocsPage({ path, anchor }: DocsPageProps) {
  const index = useContentIndex();
  const [query, setQuery] = useState('');
  const reading = useReading();

  const fuse = useMemo(
    () => (index ? new Fuse(index.docs, { keys: ['title', 'path'], threshold: 0.35, ignoreLocation: true }) : null),
    [index]
  );
  const results = useMemo(
    () => (fuse && query.trim() ? fuse.search(query.trim(), { limit: MAX_RESULTS }).map((r) => r.item) : []),
    [fuse, query]
  );

  if (!index) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <Box
        sx={{
          width: 300,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={`搜索 ${index.docs.length} 篇文章与 wiki 页面`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Box>
        <List dense sx={{ overflow: 'auto', flex: 1, pt: 0 }}>
          <ListItemButton component="a" href={docHash(HOME_DOC)} selected={path === HOME_DOC}>
            <ListItemText primary="README · 文章导航" slotProps={{ primary: { sx: { fontWeight: 600 } } }} />
          </ListItemButton>
          {!query.trim() && <Personal index={index} path={path} reading={reading} />}
          {!query.trim() && <DocTree docs={index.docs} current={path} />}
          {results.map((d) => (
            <ListItemButton key={d.path} component="a" href={docHash(d.path)} selected={d.path === path}>
              <ListItemText primary={d.title} secondary={d.path.split('/').slice(0, -1).join('/')} />
            </ListItemButton>
          ))}
          {query.trim() && results.length === 0 && (
            <Typography variant="body2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>无匹配结果</Typography>
          )}
        </List>
        <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          内容同步于 {index.generatedAt.slice(0, 10)}
          {index.sourceCommit && ` · mindforge@${index.sourceCommit}`}
          <Box component="span" sx={{ display: 'block' }}>阅读进度与收藏仅保存在本机浏览器</Box>
        </Typography>
      </Box>
      <DocView key={path} index={index} path={path} anchor={anchor} />
    </Box>
  );
}
