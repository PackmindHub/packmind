import { PMBox } from '@packmind/ui';

type Size = 'xs' | 'sm' | 'md';

const DIM: Record<Size, { box: string; font: string }> = {
  xs: { box: '18px', font: '9px' },
  sm: { box: '22px', font: '10px' },
  md: { box: '26px', font: '11px' },
};

type MemberAvatarProps = {
  initials: string;
  color: string;
  size?: Size;
};

export function MemberAvatar({
  initials,
  color,
  size = 'xs',
}: Readonly<MemberAvatarProps>) {
  const { box, font } = DIM[size];
  return (
    <PMBox
      width={box}
      height={box}
      borderRadius="999px"
      bg={color}
      color="white"
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      fontSize={font}
      fontWeight="semibold"
      flexShrink={0}
    >
      {initials}
    </PMBox>
  );
}
