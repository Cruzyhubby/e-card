import React from 'react';
import { Text, View } from 'react-native';

const STROKE = 1.8;

function strokeStyle(size, color) {
  return { borderColor: color, borderWidth: Math.max(1.5, size * 0.09) };
}

function QrIcon({ size, color }) {
  const cell = size * 0.3;
  const border = strokeStyle(size, color);
  const corner = (extra) => ({
    position: 'absolute',
    width: cell,
    height: cell,
    borderRadius: size * 0.06,
    ...border,
    ...extra,
  });
  return (
    <View style={{ width: size, height: size }}>
      <View style={corner({ left: 0, top: 0, borderRightWidth: 0, borderBottomWidth: 0 })} />
      <View style={corner({ right: 0, top: 0, borderLeftWidth: 0, borderBottomWidth: 0 })} />
      <View style={corner({ left: 0, bottom: 0, borderRightWidth: 0, borderTopWidth: 0 })} />
      <View
        style={{
          position: 'absolute',
          right: size * 0.05,
          bottom: size * 0.05,
          width: cell * 0.62,
          height: cell * 0.62,
          borderRadius: size * 0.04,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.39,
          top: size * 0.44,
          width: cell * 0.5,
          height: cell * 0.5,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function HomeIcon({ size, color }) {
  const border = strokeStyle(size, color);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.08,
          width: size * 0.42,
          height: size * 0.42,
          borderTopWidth: border.borderWidth,
          borderLeftWidth: border.borderWidth,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          borderRadius: size * 0.04,
        }}
      />
      <View
        style={{
          width: size * 0.62,
          height: size * 0.46,
          borderWidth: border.borderWidth,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: size * 0.06,
          borderBottomRightRadius: size * 0.06,
        }}
      />
    </View>
  );
}

function ScanIcon({ size, color }) {
  const arm = size * 0.3;
  const border = strokeStyle(size, color);
  const corner = (extra) => ({
    position: 'absolute',
    width: arm,
    height: arm,
    borderRadius: size * 0.05,
    ...border,
    ...extra,
  });
  return (
    <View style={{ width: size, height: size }}>
      <View style={corner({ left: 0, top: 0, borderRightWidth: 0, borderBottomWidth: 0 })} />
      <View style={corner({ right: 0, top: 0, borderLeftWidth: 0, borderBottomWidth: 0 })} />
      <View style={corner({ left: 0, bottom: 0, borderRightWidth: 0, borderTopWidth: 0 })} />
      <View style={corner({ right: 0, bottom: 0, borderLeftWidth: 0, borderTopWidth: 0 })} />
      <View
        style={{
          position: 'absolute',
          left: size * 0.3,
          right: size * 0.3,
          top: size * 0.5 - 0.75,
          height: 1.5,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function HistoryIcon({ size, color }) {
  const border = strokeStyle(size, color);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: border.borderWidth,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: border.borderWidth,
          height: size * 0.26,
          backgroundColor: color,
          marginBottom: size * 0.26,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.22,
          height: border.borderWidth,
          backgroundColor: color,
          marginLeft: size * 0.22,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

function UserIcon({ size, color }) {
  const border = strokeStyle(size, color);
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.34,
          height: size * 0.34,
          borderRadius: size * 0.17,
          borderWidth: border.borderWidth,
          borderColor: color,
          marginTop: size * 0.06,
        }}
      />
      <View
        style={{
          width: size * 0.64,
          height: size * 0.34,
          borderWidth: border.borderWidth,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.32,
          borderTopRightRadius: size * 0.32,
          marginTop: size * 0.06,
        }}
      />
    </View>
  );
}

function CameraIcon({ size, color }) {
  const border = strokeStyle(size, color);
  return (
    <View style={{ width: size, height: size * 0.82, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          width: size * 0.3,
          height: size * 0.14,
          borderTopLeftRadius: size * 0.05,
          borderTopRightRadius: size * 0.05,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: size,
          height: size * 0.64,
          borderRadius: size * 0.16,
          borderWidth: border.borderWidth,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            borderWidth: border.borderWidth,
            borderColor: color,
          }}
        />
      </View>
    </View>
  );
}

function KeyboardIcon({ size, color }) {
  const border = strokeStyle(size, color);
  const key = (index) => ({
    width: size * 0.11,
    height: size * 0.11,
    borderRadius: 1.5,
    backgroundColor: color,
    margin: size * 0.035,
  });
  return (
    <View
      style={{
        width: size * 1.1,
        height: size * 0.76,
        borderRadius: size * 0.14,
        borderWidth: border.borderWidth,
        borderColor: color,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: size * 0.06,
        paddingVertical: size * 0.08,
      }}
    >
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <View key={index} style={key(index)} />
      ))}
    </View>
  );
}

function LockIcon({ size, color }) {
  const border = strokeStyle(size, color);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          position: 'absolute',
          top: size * 0.06,
          width: size * 0.46,
          height: size * 0.44,
          borderWidth: border.borderWidth,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: size * 0.24,
          borderTopRightRadius: size * 0.24,
        }}
      />
      <View
        style={{
          width: size * 0.74,
          height: size * 0.5,
          borderRadius: size * 0.08,
          borderWidth: border.borderWidth,
          borderColor: color,
        }}
      />
    </View>
  );
}

function MailIcon({ size, color }) {
  const border = strokeStyle(size, color);
  return (
    <View
      style={{
        width: size,
        height: size * 0.74,
        borderRadius: size * 0.1,
        borderWidth: border.borderWidth,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.52,
          height: size * 0.52,
          borderLeftWidth: border.borderWidth,
          borderBottomWidth: border.borderWidth,
          borderColor: color,
          transform: [{ rotate: '-45deg' }],
          marginTop: -size * 0.2,
          borderBottomLeftRadius: 1,
        }}
      />
    </View>
  );
}

function BoltIcon({ size, color }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.22,
          height: size * 0.62,
          backgroundColor: color,
          transform: [{ skewX: '-24deg' }],
          borderTopLeftRadius: 1,
          borderTopRightRadius: 1,
          marginLeft: -size * 0.1,
          marginBottom: -size * 0.08,
        }}
      />
      <View
        style={{
          width: size * 0.22,
          height: size * 0.62,
          backgroundColor: color,
          transform: [{ skewX: '-24deg' }],
          marginLeft: size * 0.12,
          marginTop: -size * 0.08,
        }}
      />
    </View>
  );
}

function ChevronIcon({ size, color }) {
  const border = strokeStyles(size, color);
  return (
    <View
      style={{
        width: size * 0.48,
        height: size * 0.48,
        borderRightWidth: border.borderWidth,
        borderTopWidth: border.borderWidth,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginLeft: -size * 0.12,
      }}
    />
  );
}

function strokeStyles(size, color) {
  return { borderColor: color, borderWidth: Math.max(1.6, size * 0.14) };
}

function SearchIcon({ size, color }) {
  const border = strokeStyles(size, color);
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.31,
          borderWidth: border.borderWidth,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.04,
          bottom: size * 0.02,
          width: size * 0.32,
          height: border.borderWidth,
          backgroundColor: color,
          borderRadius: 2,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

function DoorIcon({ size, color }) {
  const border = strokeStyle(size, color);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          left: size * 0.06,
          width: size * 0.5,
          height: size * 0.82,
          borderWidth: border.borderWidth,
          borderRightWidth: 0,
          borderColor: color,
          borderTopRightRadius: size * 0.04,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.04,
          width: size * 0.44,
          height: border.borderWidth,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.04,
          width: size * 0.2,
          height: size * 0.2,
          borderRightWidth: border.borderWidth,
          borderTopWidth: border.borderWidth,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginRight: size * 0.16,
        }}
      />
    </View>
  );
}

function ClockIcon({ size, color }) {
  const border = strokeStyles(size, color);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: border.borderWidth,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: border.borderWidth,
          height: size * 0.28,
          backgroundColor: color,
          marginBottom: size * 0.24,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.24,
          height: border.borderWidth,
          backgroundColor: color,
          marginLeft: size * 0.22,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

function PinIcon({ size, color }) {
  const border = strokeStyles(size, color);
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View
        style={{
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: size * 0.36,
          borderWidth: border.borderWidth,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.18,
            height: size * 0.18,
            borderRadius: size * 0.09,
            backgroundColor: color,
          }}
        />
      </View>
      <View
        style={{
          width: size * 0.24,
          height: size * 0.24,
          borderRightWidth: border.borderWidth,
          borderBottomWidth: border.borderWidth,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginTop: -size * 0.16,
        }}
      />
    </View>
  );
}

function InfoIcon({ size, color }) {
  const border = strokeStyles(size, color);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: border.borderWidth,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.58, fontWeight: '800', lineHeight: size * 0.7 }}>i</Text>
    </View>
  );
}

function ShieldIcon({ size, color }) {
  const border = strokeStyle(size, color);
  return (
    <View
      style={{
        width: size * 0.82,
        height: size * 0.92,
        borderWidth: border.borderWidth,
        borderColor: color,
        borderTopLeftRadius: size * 0.3,
        borderTopRightRadius: size * 0.3,
        borderBottomLeftRadius: size * 0.42,
        borderBottomRightRadius: size * 0.42,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
}

const ICONS = {
  qr: QrIcon,
  home: HomeIcon,
  scan: ScanIcon,
  history: HistoryIcon,
  user: UserIcon,
  camera: CameraIcon,
  keyboard: KeyboardIcon,
  lock: LockIcon,
  mail: MailIcon,
  bolt: BoltIcon,
  chevron: ChevronIcon,
  search: SearchIcon,
  door: DoorIcon,
  info: InfoIcon,
  shield: ShieldIcon,
  clock: ClockIcon,
  pin: PinIcon,
};

export default function Icon({ name, size = 18, color = '#F4F7FB' }) {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  return <Glyph size={size} color={color} />;
}
