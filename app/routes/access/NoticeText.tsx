export default function NoticeText() {
  return (
    <>
      <h2>Striae Agency Registration</h2>

<p>We&apos;re excited to welcome your agency to Striae!</p>

<p>Access to Striae is completely free for all participants who are currently employed at a forensic laboratory or related organization. To register access, you&apos;ll need to use your work email address to verify eligibility.</p>

<p>Please note that Striae is intended for professional use only. Personal email domains are not permitted for registration or login. Striae reserves the right to disable accounts that do not comply with this policy.</p>

<h2>Important Details</h2>
<ul>
  <li><strong>Free Forever:</strong> All features are available at no cost to users employed by a forensic laboratory or related organization.</li>
  <li><strong>Work Domain Required:</strong> A valid work email domain is needed to register and login.</li>
  <li><strong>Feedback Welcome:</strong> We encourage you to share your thoughts with us. Every bit of feedback helps make Striae better.</li>
</ul>

<h2>Registered Agencies</h2>
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
  <ul style={{ margin: 0, paddingLeft: '20px' }}>
    <li>California Department of Justice</li>
    <li>El Poder Judicial de Costa Rica</li>
  </ul>
  <ul style={{ margin: 0, paddingLeft: '20px' }}>
    <li>Los Angeles Police Department</li>
    <li>Nichols Forensic Science Consulting</li>
  </ul>
</div>

<p>By registering, you&apos;re helping to build the future of Striae and digital annotation tools for forensic firearms examination. We can&apos;t wait to hear your insights and how you use it in your work!</p>

<h2>Register a Demo Account</h2>
<p>If you&apos;d like to trial all of Striae&apos;s features before registering your agency, please <a href="https://dev.striae.org/" target="_blank" rel="noopener noreferrer">register a demo account</a>.</p>
<p>Demo accounts are created in the development instance of Striae and provide full access to all features for evaluation purposes only. Actual casework images and data, research data, or training materials should <em>NOT</em> be uploaded or entered using a demo account. <em>Demo account files and data may be subject to regular purging without notification.</em></p>

<h2>Custom Deployment Assistance</h2>
<p>If your organization requires a custom deployment of Striae, we offer deployment assistance to meet your specific needs. <a href="https://support.striae.org/form/WA12nQGh9pS" target="_blank" rel="noopener noreferrer">Please click here to submit a request</a>.</p>

</>
  );
}