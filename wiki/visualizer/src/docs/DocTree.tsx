import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import type { SvgIconComponent } from '@mui/icons-material';
import AutoStoriesOutlined from '@mui/icons-material/AutoStoriesOutlined';
import CloudOutlined from '@mui/icons-material/CloudOutlined';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import HubOutlined from '@mui/icons-material/HubOutlined';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import GavelOutlined from '@mui/icons-material/GavelOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { docHash, HOME_DOC } from './content';
import type { DocEntry } from './content';

interface FolderNode {
  name: string;
  path: string;
  folders: FolderNode[];
  docs: DocEntry[];
  count: number;
}

interface Look {
  label: string;
  color: string;
  icon: SvgIconComponent;
}

// 顶层目录与 wiki 子目录的外观；没列出的目录继承上级的颜色
const LOOKS: Record<string, Look> = {
  Notes: { label: '笔记', color: '#5c6bc0', icon: AutoStoriesOutlined },
  Azure: { label: 'Azure', color: '#0288d1', icon: CloudOutlined },
  paper: { label: '论文', color: '#8e24aa', icon: ScienceOutlined },
  book: { label: '读书', color: '#6d4c41', icon: MenuBookOutlined },
  product: { label: '产品', color: '#00897b', icon: Inventory2Outlined },
  wiki: { label: 'Wiki', color: '#f4511e', icon: HubOutlined },
  'wiki/concepts': { label: '概念', color: '#4A90D9', icon: LightbulbOutlined },
  'wiki/methods': { label: '方法', color: '#50C878', icon: BuildOutlined },
  'wiki/decisions': { label: '决策', color: '#FF8C42', icon: GavelOutlined },
  'wiki/knowledge-gap': { label: '知识差距', color: '#e53935', icon: InsightsOutlined },
};
const ORDER = ['Notes', 'Azure', 'paper', 'book', 'product', 'wiki'];

// 目录树完全由 manifest 的路径推出来，源仓库加目录、移文件后重新同步即可，不另维护一份配置
function buildTree(docs: DocEntry[]): FolderNode {
  const root: FolderNode = { name: '', path: '', folders: [], docs: [], count: 0 };
  for (const d of docs) {
    if (d.path === HOME_DOC) continue;
    const segs = d.path.split('/').slice(0, -1);
    let node = root;
    node.count++;
    segs.forEach((seg, i) => {
      let child = node.folders.find((f) => f.name === seg);
      if (!child) {
        child = { name: seg, path: segs.slice(0, i + 1).join('/'), folders: [], docs: [], count: 0 };
        node.folders.push(child);
      }
      child.count++;
      node = child;
    });
    node.docs.push(d);
  }
  const sort = (n: FolderNode) => {
    n.folders.sort((a, b) => {
      const ia = ORDER.indexOf(a.path), ib = ORDER.indexOf(b.path);
      if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return a.name.localeCompare(b.name, 'zh');
    });
    n.docs.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
    n.folders.forEach(sort);
  };
  sort(root);
  return root;
}

// 目录名里的连字符换成空格，读起来像标题
const prettyName = (name: string) => name.replace(/[-_]+/g, ' ');

function FolderRow({ node, depth, color, open, onToggle, look }: {
  node: FolderNode;
  depth: number;
  color: string;
  open: boolean;
  onToggle: () => void;
  look?: Look;
}) {
  const Icon = look?.icon;
  return (
    <ButtonBase
      onClick={onToggle}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1,
        pl: 1 + depth * 1.5,
        pr: 1,
        py: depth === 0 ? 0.9 : 0.6,
        borderRadius: 2,
        transition: 'background-color .15s',
        '&:hover': { bgcolor: `${color}14` },
      }}
    >
      <ChevronRight
        sx={{ fontSize: 16, color: 'text.disabled', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}
      />
      {Icon ? (
        <Box
          sx={{
            width: depth === 0 ? 26 : 22,
            height: depth === 0 ? 26 : 22,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
            boxShadow: `0 2px 6px ${color}55`,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: depth === 0 ? 16 : 14 }} />
        </Box>
      ) : (
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', border: `2px solid ${color}`, flexShrink: 0, mx: 0.5 }} />
      )}
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          minWidth: 0,
          textAlign: 'left',
          fontWeight: depth === 0 ? 700 : 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textTransform: look ? 'none' : 'capitalize',
        }}
      >
        {look?.label ?? prettyName(node.name)}
      </Typography>
      <Box
        component="span"
        sx={{ fontSize: 11, fontWeight: 700, color, bgcolor: `${color}1a`, px: 0.9, py: 0.1, borderRadius: 10, flexShrink: 0 }}
      >
        {node.count}
      </Box>
    </ButtonBase>
  );
}

function DocRow({ doc, depth, color, selected }: { doc: DocEntry; depth: number; color: string; selected: boolean }) {
  return (
    <ButtonBase
      component="a"
      href={docHash(doc.path)}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1,
        pl: 1 + depth * 1.5 + 2.5,
        pr: 1,
        py: 0.5,
        borderRadius: 2,
        bgcolor: selected ? `${color}1f` : 'transparent',
        '&:hover': { bgcolor: `${color}14` },
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: color,
          opacity: selected ? 1 : 0.55,
          boxShadow: selected ? `0 0 0 3px ${color}33` : 'none',
          flexShrink: 0,
        }}
      />
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          minWidth: 0,
          textAlign: 'left',
          fontSize: 13,
          color: selected ? color : 'text.primary',
          fontWeight: selected ? 600 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={doc.title}
      >
        {doc.title}
      </Typography>
    </ButtonBase>
  );
}

function Branch({ node, depth, color, expanded, toggle, current }: {
  node: FolderNode;
  depth: number;
  color: string;
  expanded: Set<string>;
  toggle: (path: string) => void;
  current: string;
}) {
  return (
    <>
      {node.folders.map((f) => {
        const look = LOOKS[f.path];
        const c = look?.color ?? color;
        const open = expanded.has(f.path);
        return (
          <Box key={f.path} sx={{ position: 'relative' }}>
            <FolderRow node={f} depth={depth} color={c} open={open} onToggle={() => toggle(f.path)} look={look} />
            <Collapse in={open} timeout={180} unmountOnExit>
              {/* 缩进引导线 */}
              <Box sx={{ position: 'relative', '&::before': {
                content: '""', position: 'absolute', top: 2, bottom: 6, left: `${(1 + depth * 1.5) * 8 + 21}px`,
                borderLeft: `1px dashed ${c}55`,
              } }}>
                <Branch node={f} depth={depth + 1} color={c} expanded={expanded} toggle={toggle} current={current} />
                {f.docs.map((d) => (
                  <DocRow key={d.path} doc={d} depth={depth} color={c} selected={d.path === current} />
                ))}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </>
  );
}

export default function DocTree({ docs, current }: { docs: DocEntry[]; current: string }) {
  const tree = useMemo(() => buildTree(docs), [docs]);
  // 用户手动展开 / 收起过的目录；没点过的，当前文章所在的各级目录默认展开
  const [toggled, setToggled] = useState<Map<string, boolean>>(new Map());
  const expanded = useMemo(() => {
    const segs = current.split('/').slice(0, -1);
    const open = new Set(segs.map((_, i) => segs.slice(0, i + 1).join('/')));
    toggled.forEach((v, p) => (v ? open.add(p) : open.delete(p)));
    return open;
  }, [current, toggled]);

  const toggle = (path: string) =>
    setToggled((prev) => new Map(prev).set(path, !expanded.has(path)));

  return (
    <Box sx={{ px: 1, pb: 1 }}>
      <Branch node={tree} depth={0} color="#607d8b" expanded={expanded} toggle={toggle} current={current} />
    </Box>
  );
}
