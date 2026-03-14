import React from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import * as settingsService from '@/services/settingsService';
import SettingDropdown from '@/components/ui/SettingDropdown';
import SettingTextInput from '@/components/ui/SettingTextInput';
import SettingMaskedInput from '@/components/ui/SettingMaskedInput';
import ValidationBadge from '@/components/ui/ValidationBadge';

const SettingsCategoryUserProfile: React.FC = () => {
  const user = useSettingsStore((s) => s.settings.user);
  const update = useSettingsStore((s) => s.update);

  const emailValid = settingsService.validateEmail(user.email);
  const licenseValid = settingsService.validateLicenseKey(user.license_key);

  const licenseStatus = user.license_key
    ? licenseValid
      ? { status: 'valid' as const, message: 'License format valid' }
      : { status: 'error' as const, message: 'Invalid license format' }
    : { status: 'warning' as const, message: 'Trial mode (no key)' };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold mb-4">Profil utilisateur & licence</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingTextInput
          label="Full name"
          value={user.full_name}
          onChange={(value) => update('user', { full_name: value })}
          placeholder="Jane Doe"
        />

        <SettingTextInput
          label="Email"
          type="email"
          value={user.email}
          onChange={(value) => update('user', { email: value })}
          placeholder="jane@example.com"
          error={!emailValid && user.email ? 'Invalid email format' : undefined}
        />

        <SettingTextInput
          label="Organization / Studio"
          value={user.organization}
          onChange={(value) => update('user', { organization: value })}
          placeholder="Optional"
        />

        <SettingDropdown
          label="License type"
          value={user.license_type}
          options={[
            { label: 'Free', value: 'free' },
            { label: 'Pro', value: 'pro' },
            { label: 'Enterprise', value: 'enterprise' },
          ]}
          onChange={(value) =>
            update('user', { license_type: value as 'free' | 'pro' | 'enterprise' })
          }
        />

        <div className="md:col-span-2">
          <SettingMaskedInput
            label="License key"
            value={user.license_key}
            onChange={(value) => update('user', { license_key: value })}
            placeholder="XXXX-XXXX-XXXX"
            error={
              user.license_key && !licenseValid
                ? 'Expected uppercase letters, numbers, and dashes'
                : undefined
            }
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3 rounded border border-neutral-700 bg-neutral-900 p-3">
          <span className="text-sm text-neutral-300">License status</span>
          <ValidationBadge status={licenseStatus.status} message={licenseStatus.message} />
        </div>
      </div>
    </div>
  );
};

export default SettingsCategoryUserProfile;
