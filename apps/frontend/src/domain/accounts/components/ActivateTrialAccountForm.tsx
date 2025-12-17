import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMAlert,
  PMButton,
  PMField,
  PMFormContainer,
  PMInput,
  PMText,
} from '@packmind/ui';
import { createTrialActivationToken } from '@packmind/types';
import validator from 'validator';
import {
  useCheckEmailAvailabilityMutation,
  useActivateTrialAccountMutation,
} from '../api/queries';
import { organizationGateway } from '../api/gateways';
import { isPackmindError } from '../../../services/api/errors/PackmindError';
import { routes } from '../../../shared/utils/routes';
import { ActivateTrialAccountFormDataTestIds } from '@packmind/frontend';

type ActivateTrialAccountFormProps = {
  token: string;
};

type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const ORG_NAME_MAX_LENGTH = 64;
const EMAIL_MAX_LENGTH = 255;
const PASSWORD_MAX_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 8;
const MIN_SPECIAL_CHARACTERS = 2;

const countSpecialCharacters = (value: string) => {
  return (value.match(/[^a-zA-Z0-9]/g) || []).length;
};

export default function ActivateTrialAccountForm({
  token,
}: ActivateTrialAccountFormProps) {
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationNameError, setOrganizationNameError] = useState<
    string | undefined
  >(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const activateTrialAccountMutation = useActivateTrialAccountMutation();
  const checkEmailAvailabilityMutation = useCheckEmailAvailabilityMutation();
  const navigate = useNavigate();

  // Real-time organization name validation
  useEffect(() => {
    if (!organizationName.trim()) {
      setOrganizationNameError(undefined);
      return;
    }

    const validateOrganizationName = async () => {
      try {
        await organizationGateway.getByName(organizationName.trim());
        setOrganizationNameError('Organization name already exists');
      } catch {
        // If organization doesn't exist (404), that's good - name is available
        setOrganizationNameError(undefined);
      }
    };

    const debounceTimer = setTimeout(validateOrganizationName, 500);
    return () => clearTimeout(debounceTimer);
  }, [organizationName]);

  // Real-time email availability validation
  useEffect(() => {
    if (!email.trim() || !validator.isEmail(email)) {
      setEmailError(undefined);
      return;
    }

    const validateEmailAvailability = async () => {
      try {
        const result = await checkEmailAvailabilityMutation.mutateAsync({
          email: email.trim(),
        });

        if (!result.available) {
          setEmailError('This email is already registered');
        } else {
          setEmailError(undefined);
        }
      } catch (error) {
        console.error('Failed to check email availability:', error);
        // Don't show error to user for availability check failures
        setEmailError(undefined);
      }
    };

    const debounceTimer = setTimeout(validateEmailAvailability, 500);
    return () => clearTimeout(debounceTimer);
  }, [email, checkEmailAvailabilityMutation]);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validator.isEmail(email)) {
      newErrors.email = 'Email must be a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (countSpecialCharacters(password) < MIN_SPECIAL_CHARACTERS) {
      newErrors.password =
        'Password must contain at least 2 non-alphanumerical characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationName.trim()) {
      setOrganizationNameError('Organization name is required');
      return;
    }

    if (organizationNameError) {
      return;
    }

    if (emailError) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      const result = await activateTrialAccountMutation.mutateAsync({
        activationToken: createTrialActivationToken(token),
        email: email.trim(),
        password,
        organizationName: organizationName.trim(),
      });

      // Navigate to organization dashboard after successful activation
      navigate(routes.org.toDashboard(result.organization.slug));
    } catch (error) {
      let message =
        'Failed to activate account. The link may be invalid or expired.';

      if (isPackmindError(error)) {
        message = error.serverError.data.message;
      }

      setFormErrors({ form: message });
    }
  };

  const isSubmitting = activateTrialAccountMutation.isPending;

  const organizationNameId = 'activate-organization-name';
  const emailId = 'activate-email';
  const passwordId = 'activate-password';
  const confirmPasswordId = 'activate-confirm-password';

  return (
    <form
      onSubmit={handleSubmit}
      data-testId={ActivateTrialAccountFormDataTestIds.Component}
    >
      <PMFormContainer maxWidth="full" spacing={4}>
        <PMField.Root required invalid={!!organizationNameError}>
          <PMField.Label>
            Organization Name{' '}
            <PMText as="span" variant="small" color="secondary">
              ({organizationName.length} / {ORG_NAME_MAX_LENGTH} max)
            </PMText>
            <PMField.RequiredIndicator />
          </PMField.Label>

          <PMInput
            id={organizationNameId}
            value={organizationName}
            onChange={(e) => {
              setOrganizationName(e.target.value);
              setOrganizationNameError(undefined);
            }}
            placeholder="Enter organization name"
            required
            disabled={isSubmitting}
            maxLength={ORG_NAME_MAX_LENGTH}
            data-testId={ActivateTrialAccountFormDataTestIds.OrganizationField}
          />
          <PMField.ErrorText>{organizationNameError}</PMField.ErrorText>
        </PMField.Root>

        <PMField.Root required invalid={!!formErrors.email || !!emailError}>
          <PMField.Label>
            Email{' '}
            <PMText as="span" variant="small" color="secondary">
              ({email.length} / {EMAIL_MAX_LENGTH} max)
            </PMText>
            <PMField.RequiredIndicator />
          </PMField.Label>

          <PMInput
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(undefined);
            }}
            placeholder="Enter your email"
            required
            disabled={isSubmitting}
            maxLength={EMAIL_MAX_LENGTH}
            data-testId={ActivateTrialAccountFormDataTestIds.EmailField}
          />
          <PMField.ErrorText>
            {formErrors.email || emailError}
          </PMField.ErrorText>
        </PMField.Root>

        <PMField.Root required invalid={!!formErrors.password}>
          <PMField.Label>
            Password{' '}
            <PMText as="span" variant="small" color="secondary">
              ({password.length} / {PASSWORD_MAX_LENGTH} max)
            </PMText>
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMField.HelperText as={'article'}>
            8 characters min. with at least 2 non-alphanumerical characters.
          </PMField.HelperText>

          <PMInput
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={isSubmitting}
            maxLength={PASSWORD_MAX_LENGTH}
            data-testId={ActivateTrialAccountFormDataTestIds.PasswordField}
          />
          <PMField.ErrorText>{formErrors.password}</PMField.ErrorText>
        </PMField.Root>

        <PMField.Root required invalid={!!formErrors.confirmPassword}>
          <PMField.Label>
            Confirm Password
            <PMField.RequiredIndicator />
          </PMField.Label>
          <PMInput
            id={confirmPasswordId}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
            disabled={isSubmitting}
            maxLength={PASSWORD_MAX_LENGTH}
            data-testId={
              ActivateTrialAccountFormDataTestIds.ConfirmPasswordField
            }
          />
          <PMField.ErrorText>{formErrors.confirmPassword}</PMField.ErrorText>
        </PMField.Root>

        {formErrors.form && (
          <PMAlert.Root status="error">
            <PMAlert.Indicator />
            <PMAlert.Title>{formErrors.form}</PMAlert.Title>
          </PMAlert.Root>
        )}

        <PMButton
          type="submit"
          disabled={isSubmitting || !!organizationNameError || !!emailError}
          data-testId={ActivateTrialAccountFormDataTestIds.Submit}
        >
          {isSubmitting ? 'Activating Account...' : 'Activate Account'}
        </PMButton>
      </PMFormContainer>
    </form>
  );
}
