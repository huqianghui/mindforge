import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import type { GraphNode, WikiLink } from '../types';
import { NODE_COLORS, NODE_TYPE_LABELS, RELATION_COLORS, RELATION_TYPE_LABELS } from '../theme';

interface NodePanelProps {
  node: GraphNode | null;
  allLinks: WikiLink[];
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
}

function confidenceColor(c: number): 'success' | 'warning' | 'error' {
  if (c >= 0.7) return 'success';
  if (c >= 0.4) return 'warning';
  return 'error';
}

// 关系描述：短则完整平铺，长则夹到 3 行 + hover 显示完整。
// 阈值按半宽单位算（中日韩/全角字符计 2），150 单位 ≈ 350px 面板下的 3 行。
const DESC_CLAMP_UNITS = 150;

function effectiveWidth(s: string): number {
  let n = 0;
  for (const ch of s) n += /[⺀-￿]/.test(ch) ? 2 : 1;
  return n;
}

function RelationDescription({ text }: { text: string }) {
  const long = effectiveWidth(text) > DESC_CLAMP_UNITS;
  const body = (
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        whiteSpace: 'normal',
        lineHeight: 1.45,
        mt: 0.3,
        wordBreak: 'break-word',
        ...(long
          ? {
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              cursor: 'help',
            }
          : { display: 'block' }),
      }}
    >
      {text}
    </Typography>
  );
  return long ? (
    <Tooltip title={text} placement="left" arrow enterTouchDelay={0} leaveTouchDelay={4000}>
      {body}
    </Tooltip>
  ) : (
    body
  );
}

export default function NodePanel({ node, allLinks, onClose, onNavigate }: NodePanelProps) {
  if (!node) return null;

  const outgoing = allLinks.filter((l) => l.source === node.id);
  const incoming = allLinks.filter((l) => l.target === node.id);

  return (
    <Drawer
      anchor="right"
      open={!!node}
      onClose={onClose}
      variant="persistent"
      sx={{
        '& .MuiDrawer-paper': {
          width: 350,
          boxSizing: 'border-box',
          p: 0,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1, mr: 1 }}>
            {node.title}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
          <Chip
            label={NODE_TYPE_LABELS[node.type]}
            size="small"
            sx={{ bgcolor: NODE_COLORS[node.type], color: '#fff', fontWeight: 600 }}
          />
          <Chip label={node.category} size="small" variant="outlined" />
          {node.decision_status && (
            <Chip label={node.decision_status} size="small" color="warning" variant="outlined" />
          )}
          {node.method_type && (
            <Chip label={node.method_type} size="small" color="info" variant="outlined" />
          )}
        </Box>

        <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', lineHeight: 1.6 }}>
          {node.summary}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
          {node.tags.map((t) => (
            <Chip key={t} label={t} size="small" sx={{ fontSize: 11, height: 22 }} />
          ))}
        </Box>
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          论断 ({node.claims.length}) &mdash; 平均置信度{' '}
          {(node.avg_confidence * 100).toFixed(0)}%
        </Typography>
        {node.claims.map((claim, i) => (
          <Box key={i} sx={{ mb: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.3 }}>
              {claim.statement}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={claim.confidence * 100}
                color={confidenceColor(claim.confidence)}
                sx={{ flex: 1, height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" sx={{ minWidth: 32 }}>
                {(claim.confidence * 100).toFixed(0)}%
              </Typography>
              <Chip
                label={claim.status}
                size="small"
                color={claim.status === 'active' ? 'success' : 'default'}
                sx={{ fontSize: 10, height: 18 }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {claim.source} &middot; {claim.last_updated}
            </Typography>
          </Box>
        ))}
      </Box>

      <Divider />

      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          关系 ({outgoing.length + incoming.length})
        </Typography>

        {outgoing.length > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
              出边（本页指向别处）
            </Typography>
            <List dense disablePadding>
              {outgoing.map((l, i) => (
                <ListItem
                  key={i}
                  disablePadding
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, pl: 1, borderRadius: 1 }}
                  onClick={() => onNavigate(l.target)}
                >
                  <Box sx={{ width: '100%', py: 0.3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={RELATION_TYPE_LABELS[l.relation_type] || l.relation_type}
                        size="small"
                        sx={{
                          bgcolor: RELATION_COLORS[l.relation_type] || RELATION_COLORS.untyped,
                          color: '#fff',
                          fontSize: 10,
                          height: 18,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        &rarr;
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {l.target}
                      </Typography>
                    </Box>
                    {l.description && <RelationDescription text={l.description} />}
                  </Box>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {incoming.length > 0 && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mt: 1, mb: 0.5 }}>
              入边（别处指向本页）
            </Typography>
            <List dense disablePadding>
              {incoming.map((l, i) => (
                <ListItem
                  key={i}
                  disablePadding
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, pl: 1, borderRadius: 1 }}
                  onClick={() => onNavigate(l.source)}
                >
                  <Box sx={{ width: '100%', py: 0.3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {l.source}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        &mdash;
                      </Typography>
                      <Chip
                        label={RELATION_TYPE_LABELS[l.relation_type] || l.relation_type}
                        size="small"
                        sx={{
                          bgcolor: RELATION_COLORS[l.relation_type] || RELATION_COLORS.untyped,
                          color: '#fff',
                          fontSize: 10,
                          height: 18,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        &rarr;
                      </Typography>
                    </Box>
                    {l.description && <RelationDescription text={l.description} />}
                  </Box>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>
    </Drawer>
  );
}
