import { PMGrid } from '../../layout/PMGrid/PMGrid';
import { PMGridItem } from '../../layout/PMGridItem/PMGridItem';
import { PMHeader } from '../../layout/PMHeader/PMHeader';

interface IPMTwoColumnsLayoutProps {
  breadcrumbComponent: React.ReactNode;
  leftColumn: React.ReactNode;
  rightColumn: React.ReactNode;
}

export const PMTwoColumnsLayout: React.FC<IPMTwoColumnsLayoutProps> = ({
  breadcrumbComponent,
  leftColumn,
  rightColumn,
}) => {
  return (
    <PMGrid
      maxH={'100%'}
      height={'100%'}
      overflow={'hidden'}
      templateRows={`${breadcrumbComponent ? '44px' : ''} 1fr`}
    >
      {breadcrumbComponent && (
        <PMGridItem>
          <PMHeader color="secondary">{breadcrumbComponent}</PMHeader>
        </PMGridItem>
      )}
      <PMGridItem overflow={'auto'}>
        <PMGrid
          maxH={'100%'}
          height={'100%'}
          overflow={'hidden'}
          templateColumns={`320px 1fr`}
        >
          {leftColumn}
          {rightColumn}
        </PMGrid>
      </PMGridItem>
    </PMGrid>
  );
};
