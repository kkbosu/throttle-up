// The frame every machine inset shares: a panel over the scene with its title top left. The inset then draws its
// status (top right), its little picture and its readouts inside. Labels use lbl(), numbers num() (core/tokens.js).
import { T, lbl } from '../core/tokens.js';
import { g } from '../core/util.js';

export function insetFrame(x, y, w, h, title) {
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.fillStyle = T.panel;
  g.strokeStyle = T.rule;
  g.lineWidth = 1;
  g.fillRect(x, y, w, h);
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.font = lbl(10, 600);
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillStyle = T.dim;
  g.fillText(title, x + 8, y + 11);
}
