import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

/**
 * İkonlar SVG olarak çizilir. İkon fontu (@expo/vector-icons) yerine bu yol
 * seçildi: fazladan bağımlılık ve font yükleme adımı yok, her ölçekte keskin
 * ve renk temadan geliyor.
 */
export type IconName =
  | 'play'
  | 'pause'
  | 'prev'
  | 'next'
  | 'restart'
  | 'close'
  | 'plus'
  | 'chevronLeft'
  | 'chevronRight'
  | 'library'
  | 'chart'
  | 'train'
  | 'settings'
  | 'trash'
  | 'check'
  | 'globe'
  | 'file'
  | 'paste'
  | 'focus'
  | 'sparkle'
  | 'chat'
  | 'book'
  | 'sun'
  | 'grid'
  | 'eye'
  | 'search'
  | 'award'
  | 'download'
  | 'upload'
  | 'quote'
  | 'headphones'
  | 'share'
  | 'bookmark'
  | 'bookmarkFilled';

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color, strokeWidth = 2 }: IconProps) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'play' && <Polygon points="7,4 20,12 7,20" fill={color} />}
      {name === 'pause' && (
        <>
          <Rect x={6} y={4} width={4} height={16} rx={1.5} fill={color} />
          <Rect x={14} y={4} width={4} height={16} rx={1.5} fill={color} />
        </>
      )}
      {name === 'prev' && (
        <>
          <Polygon points="19,4 8,12 19,20" fill={color} />
          <Rect x={4} y={4} width={2.5} height={16} rx={1.25} fill={color} />
        </>
      )}
      {name === 'next' && (
        <>
          <Polygon points="5,4 16,12 5,20" fill={color} />
          <Rect x={17.5} y={4} width={2.5} height={16} rx={1.25} fill={color} />
        </>
      )}
      {name === 'restart' && (
        <>
          <Path d="M20 12a8 8 0 1 1-2.4-5.7" {...stroke} />
          <Polyline points="20,3 20,8 15,8" {...stroke} />
        </>
      )}
      {name === 'close' && (
        <>
          <Line x1={6} y1={6} x2={18} y2={18} {...stroke} />
          <Line x1={18} y1={6} x2={6} y2={18} {...stroke} />
        </>
      )}
      {name === 'plus' && (
        <>
          <Line x1={12} y1={5} x2={12} y2={19} {...stroke} />
          <Line x1={5} y1={12} x2={19} y2={12} {...stroke} />
        </>
      )}
      {name === 'chevronLeft' && <Polyline points="15,5 8,12 15,19" {...stroke} />}
      {name === 'chevronRight' && <Polyline points="9,5 16,12 9,19" {...stroke} />}
      {name === 'library' && (
        <>
          <Path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5z" {...stroke} />
          <Path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z" {...stroke} />
        </>
      )}
      {name === 'chart' && (
        <>
          <Rect x={4} y={13} width={4} height={7} rx={1.5} fill={color} />
          <Rect x={10} y={8} width={4} height={12} rx={1.5} fill={color} />
          <Rect x={16} y={4} width={4} height={16} rx={1.5} fill={color} />
        </>
      )}
      {name === 'train' && (
        <>
          <Line x1={4} y1={12} x2={20} y2={12} {...stroke} />
          <Rect x={2.5} y={7.5} width={4} height={9} rx={1.5} fill={color} />
          <Rect x={17.5} y={7.5} width={4} height={9} rx={1.5} fill={color} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Line x1={4} y1={7} x2={20} y2={7} {...stroke} />
          <Line x1={4} y1={12} x2={20} y2={12} {...stroke} />
          <Line x1={4} y1={17} x2={20} y2={17} {...stroke} />
          <Circle cx={9} cy={7} r={2.6} fill={color} />
          <Circle cx={15} cy={12} r={2.6} fill={color} />
          <Circle cx={11} cy={17} r={2.6} fill={color} />
        </>
      )}
      {name === 'trash' && (
        <>
          <Polyline points="4,7 20,7" {...stroke} />
          <Path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" {...stroke} />
          <Path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" {...stroke} />
        </>
      )}
      {name === 'check' && <Polyline points="5,13 10,18 19,6" {...stroke} />}
      {name === 'globe' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...stroke} />
          <Line x1={3.5} y1={12} x2={20.5} y2={12} {...stroke} />
          <Path d="M12 3.5c2.6 3 2.6 14 0 17M12 3.5c-2.6 3-2.6 14 0 17" {...stroke} />
        </>
      )}
      {name === 'file' && (
        <>
          <Path d="M6 3.5h7.5L19 9v11.5H6z" {...stroke} />
          <Polyline points="13,3.5 13,9 19,9" {...stroke} />
        </>
      )}
      {name === 'paste' && (
        <>
          <Rect x={5} y={4.5} width={11} height={15} rx={2} {...stroke} />
          <Polyline points="9,9.5 12.5,9.5" {...stroke} />
          <Polyline points="9,13 12.5,13" {...stroke} />
          <Path d="M11 7.5h6a2 2 0 0 1 2 2v10" {...stroke} />
        </>
      )}
      {name === 'focus' && (
        <>
          <Circle cx={12} cy={12} r={3} fill={color} />
          <Path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" {...stroke} />
        </>
      )}
      {name === 'sparkle' && (
        <>
          <Path d="M12 3l1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8z" fill={color} />
          <Path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" fill={color} />
        </>
      )}
      {name === 'chat' && (
        <Path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" {...stroke} />
      )}
      {name === 'book' && (
        <>
          <Path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6.5A1.5 1.5 0 0 1 5 19.5z" {...stroke} />
          <Line x1={9} y1={7} x2={15} y2={7} {...stroke} />
          <Line x1={9} y1={11} x2={15} y2={11} {...stroke} />
        </>
      )}
      {name === 'sun' && (
        <>
          <Circle cx={12} cy={12} r={4} {...stroke} />
          <Path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" {...stroke} />
        </>
      )}
      {name === 'grid' && (
        <>
          <Rect x={4} y={4} width={7} height={7} rx={1.5} {...stroke} />
          <Rect x={13} y={4} width={7} height={7} rx={1.5} {...stroke} />
          <Rect x={4} y={13} width={7} height={7} rx={1.5} {...stroke} />
          <Rect x={13} y={13} width={7} height={7} rx={1.5} {...stroke} />
        </>
      )}
      {name === 'eye' && (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...stroke} />
          <Circle cx={12} cy={12} r={3} {...stroke} />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={6.5} {...stroke} />
          <Line x1={16} y1={16} x2={20.5} y2={20.5} {...stroke} />
        </>
      )}
      {name === 'award' && (
        <>
          <Circle cx={12} cy={9} r={5.5} {...stroke} />
          <Polyline points="8.5,13.5 7,21 12,18.5 17,21 15.5,13.5" {...stroke} />
        </>
      )}
      {name === 'download' && (
        <>
          <Line x1={12} y1={4} x2={12} y2={15} {...stroke} />
          <Polyline points="7,10.5 12,15.5 17,10.5" {...stroke} />
          <Path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16" {...stroke} />
        </>
      )}
      {name === 'upload' && (
        <>
          <Line x1={12} y1={15.5} x2={12} y2={4.5} {...stroke} />
          <Polyline points="7,9 12,4 17,9" {...stroke} />
          <Path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16" {...stroke} />
        </>
      )}
      {(name === 'bookmark' || name === 'bookmarkFilled') && (
        <Path
          d="M7 3.5h10a1 1 0 0 1 1 1V20.5l-6-4.2-6 4.2V4.5a1 1 0 0 1 1-1z"
          {...stroke}
          fill={name === 'bookmarkFilled' ? color : 'none'}
        />
      )}
      {name === 'quote' && (
        <>
          <Path d="M4.5 18h5v-5.5H6.6c0-2.3 1-3.6 3-4.2V5.5C6.2 6.2 4.5 8.8 4.5 12.5z" fill={color} />
          <Path d="M13.5 18h5v-5.5h-2.9c0-2.3 1-3.6 3-4.2V5.5c-3.4.7-5.1 3.3-5.1 7z" fill={color} />
        </>
      )}
      {name === 'headphones' && (
        <>
          <Path d="M4 15v-3a8 8 0 0 1 16 0v3" {...stroke} />
          <Rect x={3.5} y={14} width={4} height={6.5} rx={1.5} {...stroke} />
          <Rect x={16.5} y={14} width={4} height={6.5} rx={1.5} {...stroke} />
        </>
      )}
      {name === 'share' && (
        <>
          <Circle cx={6.5} cy={12} r={2.5} {...stroke} />
          <Circle cx={17.5} cy={6} r={2.5} {...stroke} />
          <Circle cx={17.5} cy={18} r={2.5} {...stroke} />
          <Line x1={8.7} y1={10.8} x2={15.3} y2={7.2} {...stroke} />
          <Line x1={8.7} y1={13.2} x2={15.3} y2={16.8} {...stroke} />
        </>
      )}
    </Svg>
  );
}
