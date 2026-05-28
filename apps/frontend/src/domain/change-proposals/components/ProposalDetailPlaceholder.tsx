import { PMBox, PMSpinner, PMText } from '@packmind/ui';

export function ProposalDetailLoading() {
  return (
    <PMBox
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="300px"
      gridColumn="span 2"
    >
      <PMSpinner />
    </PMBox>
  );
}

export function ProposalDetailEmpty() {
  return (
    <PMBox
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="300px"
      gridColumn="span 2"
    >
      <PMText color="secondary">
        This proposal has already been processed or does not exist.
      </PMText>
    </PMBox>
  );
}
