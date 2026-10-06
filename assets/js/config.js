// Public configuration. Never include secret keys here.
window.PORTFOLIO_CONFIG = {
  contactEndpoint: 'https://wafiq-portfolio-contact.whashby.workers.dev/contact',
  turnstileSiteKey: '0x4AAAAAAFPi8Z2UqYy5_zlT',
  plugins: [
    {name: 'AutoDash', icon: 'AD', category: 'AUTOTASK', description: 'Build KPI dashboards for Autotask using the Autotask API.', file: 'autodash.zip'},
    {name: 'AutoDesk', icon: 'A⌘', category: 'AUTOTASK', description: 'Manage service calls and tickets in Autotask using the Autotask API.', file: 'autodesk.zip'},
    {name: 'Calendly Bookings', icon: 'CB', category: 'BOOKINGS', description: 'My WordPress plugin for working with Calendly bookings.', file: 'calendly-bookings.zip'},
    {name: 'WP Mailchimp Sync', icon: 'MS', category: 'INTEGRATION', description: 'My WordPress plugin for Mailchimp synchronization.', file: 'wp-mailchimp-sync.zip'},
    {name: 'Bulk First-to-Last Name Split', icon: 'FL', category: 'AIR WP SYNC', description: 'A name-splitting utility for Air WP Sync workflows.', file: 'bulk-first-to-last-name-split.zip'}
  ]
};
