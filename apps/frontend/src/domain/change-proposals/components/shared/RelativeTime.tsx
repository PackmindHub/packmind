import { PMText, PMTextColors, PMTooltip } from '@packmind/ui';
import {
  formatExactDate,
  formatRelativeTime,
} from '../../utils/formatRelativeTime';

interface RelativeTimeProps {
  date: Date;
  fontSize?: string;
  color?: PMTextColors;
}

export function RelativeTime({
  date,
  fontSize,
  color,
}: Readonly<RelativeTimeProps>) {
  return (
    <PMTooltip label={formatExactDate(date)}>
      <PMText as="span" fontSize={fontSize} color={color} py={1} my={-1}>
        {formatRelativeTime(date)}
      </PMText>
    </PMTooltip>
  );
}
