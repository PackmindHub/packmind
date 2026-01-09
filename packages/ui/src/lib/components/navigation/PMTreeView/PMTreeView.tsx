import { TreeView as ChakraTreeView } from '@chakra-ui/react';

export {
  TreeViewRoot as PMTreeViewRoot,
  TreeViewBranch as PMTreeViewBranch,
  TreeViewBranchContent as PMTreeViewBranchContent,
  TreeViewBranchControl as PMTreeViewBranchControl,
  TreeViewBranchIndicator as PMTreeViewBranchIndicator,
  TreeViewBranchText as PMTreeViewBranchText,
  TreeViewBranchTrigger as PMTreeViewBranchTrigger,
  TreeViewBranchIndentGuide as PMTreeViewBranchIndentGuide,
  TreeViewItem as PMTreeViewItem,
  TreeViewItemIndicator as PMTreeViewItemIndicator,
  TreeViewItemText as PMTreeViewItemText,
  TreeViewLabel as PMTreeViewLabel,
  TreeViewTree as PMTreeViewTree,
  TreeViewNode as PMTreeViewNode,
  TreeViewNodeCheckbox as PMTreeViewNodeCheckbox,
  TreeViewRootProvider as PMTreeViewRootProvider,
  useTreeViewStyles as usePMTreeViewStyles,
  createTreeCollection,
  createFileTreeCollection,
} from '@chakra-ui/react';

export type {
  TreeViewRootProps as PMTreeViewRootProps,
  TreeViewBranchProps as PMTreeViewBranchProps,
  TreeViewBranchContentProps as PMTreeViewBranchContentProps,
  TreeViewBranchControlProps as PMTreeViewBranchControlProps,
  TreeViewBranchIndicatorProps as PMTreeViewBranchIndicatorProps,
  TreeViewBranchTextProps as PMTreeViewBranchTextProps,
  TreeViewBranchTriggerProps as PMTreeViewBranchTriggerProps,
  TreeViewBranchIndentGuideProps as PMTreeViewBranchIndentGuideProps,
  TreeViewItemProps as PMTreeViewItemProps,
  TreeViewItemIndicatorProps as PMTreeViewItemIndicatorProps,
  TreeViewItemTextProps as PMTreeViewItemTextProps,
  TreeViewLabelProps as PMTreeViewLabelProps,
  TreeViewTreeProps as PMTreeViewTreeProps,
  TreeViewNodeProps as PMTreeViewNodeProps,
  TreeViewNodeRenderProps as PMTreeViewNodeRenderProps,
  TreeViewNodeCheckboxProps as PMTreeViewNodeCheckboxProps,
  TreeViewRootProviderProps as PMTreeViewRootProviderProps,
} from '@chakra-ui/react';

// Re-export the namespace for convenience
export const PMTreeView = ChakraTreeView;
