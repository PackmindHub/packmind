import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Versions() {
  const { siteConfig } = useDocusaurusContext();

  // For now, we'll show a simple current version since no versioning is configured
  const currentVersion = {
    name: 'current',
    label: 'Current',
    path: '/',
    isLast: true,
  };

  return (
    <Layout
      title="Documentation Versions"
      description={`All available versions of ${siteConfig.title} documentation`}
    >
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <h1>Documentation Versions</h1>
            <p>
              Here you can find all available versions of the Packmind
              documentation. We recommend using the latest stable version for
              production use.
            </p>

            <div className="margin-vert--lg">
              <h2>Current Versions</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Documentation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>{currentVersion.label}</strong>
                      <span className="badge badge--success margin-left--sm">
                        Latest
                      </span>
                    </td>
                    <td>Stable - Recommended</td>
                    <td>
                      <Link
                        to={currentVersion.path}
                        className="button button--primary button--sm"
                      >
                        Browse Docs
                      </Link>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="margin-vert--lg">
              <h2>Release Notes</h2>
              <p>
                For detailed information about changes in each version, please
                visit our{' '}
                <Link href="https://github.com/PackmindHub/packmind-monorepo/releases">
                  GitHub releases page
                </Link>
                .
              </p>
            </div>

            <div className="margin-vert--lg">
              <h2>Version Support</h2>
              <div className="admonition admonition-info">
                <div className="admonition-heading">
                  <h5>Support Policy</h5>
                </div>
                <div className="admonition-content">
                  <p>
                    We maintain the latest stable version and provide security
                    updates. Older versions are archived and available for
                    reference but may not receive updates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
