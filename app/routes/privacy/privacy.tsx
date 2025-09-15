/* eslint-disable react/no-unescaped-entities */
import { baseMeta } from '~/utils/meta';
import { Link } from '@remix-run/react';
import styles from './privacy.module.css';

export const meta = () => {
  return baseMeta({
    title: 'Privacy Policy',
    description: 'Privacy policy and data handling practices for Striae.',
  });
};

export const Privacy = () => {
  return (
    <div id="top" className={styles.container}>
      <Link 
        viewTransition
        prefetch="intent"
        to="/#top" 
        className={styles.logoLink}>
        <div className={styles.logo} />
      </Link>
      <div className={styles.content}>
        <h1>Privacy Policy</h1>
        <p className={styles.lastUpdated}>Last updated: September 12, 2025</p>        
        <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
        <p>We use Your Personal data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>
        
        <section className={styles.section}>
          <h2>Interpretation and Definitions</h2>
          <h3>Interpretation</h3>
          <p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>          
          
          <h3>Definitions</h3>
<p>For the purposes of this Privacy Policy:</p>
<ul>
<li>
<p><strong>Account</strong> means a unique account created for You to access Our Service or parts of Our Service.</p>
</li>
<li>
<p><strong>Affiliate</strong> means an entity that controls, is controlled by or is under common control with a party, where &quot;control&quot; means ownership of 50% or more of the shares, equity interest or other securities entitled to vote for election of directors or other managing authority.</p>
</li>
<li>
<p><strong>Application</strong> refers to Striae, the software program provided by the Company.</p>
</li>
<li>
<p><strong>Business</strong>, for the purpose of CCPA/CPRA, refers to the Company as the legal entity that collects Consumers' personal information and determines the purposes and means of the processing of Consumers' personal information, or on behalf of which such information is collected and that alone, or jointly with others, determines the purposes and means of the processing of consumers' personal information, that does business in the State of California.</p>
</li>
<li>
<p><strong>CCPA</strong> and/or <strong>CPRA</strong> refers to the California Consumer Privacy Act (the &quot;CCPA&quot;) as amended by the California Privacy Rights Act of 2020 (the &quot;CPRA&quot;).</p>
</li>
<li>
<p><strong>Company</strong> (referred to as either &quot;the Company&quot;, &quot;We&quot;, &quot;Us&quot; or &quot;Our&quot; in this Agreement) refers to Striae, owned and operated by The Stephenson Jack Lu Living Trust, <a href="https://www.striae.org" target="_blank" rel="noopener noreferrer">https://www.striae.org</a>.</p>
</li>
<li>
<p><strong>Consumer</strong>, for the purpose of the CCPA/CPRA, means a natural person who is a California resident. A resident, as defined in the law, includes (1) every individual who is in the USA for other than a temporary or transitory purpose, and (2) every individual who is domiciled in the USA who is outside the USA for a temporary or transitory purpose.</p>
</li>
<li>
<p><strong>Country</strong> refers to: United States</p>
</li>
<li>
<p><strong>Device</strong> means any device that can access the Service such as a computer, a cellphone or a digital tablet.</p>
</li>
<li>
<p><strong>Do Not Track</strong> (DNT) is a concept that has been promoted by US regulatory authorities, in particular the U.S. Federal Trade Commission (FTC), for the Internet industry to develop and implement a mechanism for allowing internet users to control the tracking of their online activities across websites.</p>
</li>
<li>
<p><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</p>
<p>For the purposes of the CCPA/CPRA, Personal Data means any information that identifies, relates to, describes or is capable of being associated with, or could reasonably be linked, directly or indirectly, with You.</p>
</li>
<li>
<p><strong>Service</strong> refers to the Application.</p>
</li>
<li>
<p><strong>Service Provider</strong> means any natural or legal person who processes the data on behalf of the Company. It refers to third-party companies or individuals employed by the Company to facilitate the Service, to provide the Service on behalf of the Company, to perform services related to the Service or to assist the Company in analyzing how the Service is used.</p>
</li>
<li>
<p><strong>Usage Data</strong> refers to data collected automatically, either generated by the use of the Service or from the Service infrastructure itself (for example, the duration of a page visit).</p>
</li>
<li>
<p><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</p>
</li>
</ul>
        </section>
        <section className={styles.section}>
          <h2>Collecting and Using Your Personal Data</h2>
<h3>Types of Data Collected</h3>
<h4>Personal Data</h4>
<p>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:</p>
<ul>
<li>
<p>Email address</p>
</li>
<li>
<p>First name and last name</p>
</li>
<li>
<p>Employer</p>
</li>
<li>
<p>Usage Data</p>
</li>
</ul>
<h4>Usage Data</h4>
<p>Usage Data is collected automatically when using the Service.</p>
<p>Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of Our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
<p>When You access the Service by or through a mobile device, We may collect certain information automatically, including, but not limited to, the type of mobile device You use, Your mobile device unique ID, the IP address of Your mobile device, Your mobile operating system, the type of mobile Internet browser You use, unique device identifiers and other diagnostic data.</p>
<p>We may also collect information that Your browser sends whenever You visit Our Service or when You access the Service by or through a mobile device.</p>
<h3>Use of Your Personal Data</h3>
<p>The Company may use Personal Data for the following purposes:</p>
<ul>
<li>
<p><strong>To provide and maintain Our Service</strong>, including to monitor the usage of Our Service.</p>
</li>
<li>
<p><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service. The Personal Data You provide can give You access to different functionalities of the Service that are available to You as a registered user.</p>
</li>
<li>
<p><strong>For the performance of a contract:</strong> the development, compliance and undertaking of the purchase contract for the products, items or services You have purchased or of any other contract with Us through the Service.</p>
</li>
<li>
<p><strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication, such as a mobile application's push notifications regarding updates or informative communications related to the functionalities, products or contracted services, including the security updates, when necessary or reasonable for their implementation.</p>
</li>
<li>
<p><strong>To provide You</strong> with news, special offers and general information about other goods, services and events which We offer that are similar to those that You have already purchased or enquired about unless You have opted not to receive such information.</p>
</li>
<li>
<p><strong>To manage Your requests:</strong> To attend and manage Your requests to Us.</p>
</li>
<li>
<p><strong>For business transfers:</strong> We may use Your information to evaluate or conduct a merger, divestiture, restructuring, reorganization, dissolution, or other sale or transfer of some or all of Our assets, whether as a going concern or as part of bankruptcy, liquidation, or similar proceeding, in which Personal Data held by Us about Our Service users is among the assets transferred.</p>
</li>
<li>
<p><strong>For other purposes</strong>: We may use Your information for other purposes, such as data analysis, identifying usage trends, determining the effectiveness of Our promotional campaigns and to evaluate and improve Our Service, products, services, marketing and Your experience.</p>
</li>
</ul>
<p>We may share Your personal information in the following situations:</p>
<ul>
<li><strong>With Service Providers:</strong> We may share Your personal information with Service Providers to provide technical operation of the Application, monitor and analyze the use of Our Service, to contact You.</li>
<li><strong>For business transfers:</strong> We may share or transfer Your personal information in connection with, or during negotiations of, any merger, sale of Company assets, financing, or acquisition of all or a portion of Our business to another company.</li>
<li><strong>With Affiliates:</strong> We may share Your information with Our affiliates, in which case We will require those affiliates to honor this Privacy Policy. Affiliates include Our parent company and any other subsidiaries, joint venture partners or other companies that We control or that are under common control with Us.</li>
<li><strong>With business partners:</strong> We may share Your information with Our business partners to offer You certain products, services or promotions.</li>
<li><strong>With other users:</strong> when You share personal information or otherwise interact in the public areas with other users, such information may be viewed by all users and may be publicly distributed outside.</li>
<li><strong>With Your consent</strong>: We may disclose Your personal information for any other purpose with Your consent.</li>
</ul>
<h3>Retention of Your Personal Data</h3>
<p>The Company will retain Your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use Your Personal Data to the extent necessary to comply with Our legal obligations (for example, if We are required to retain Your data to comply with applicable laws), resolve disputes, and enforce Our legal agreements and policies.</p>
<p>The Company will also retain Usage Data for internal analysis purposes. Usage Data is generally retained for a shorter period of time, except when this data is used to strengthen the security or to improve the functionality of Our Service, or We are legally obligated to retain this data for longer time periods.</p>
<h3>Transfer of Your Personal Data</h3>
<p>Your information, including Personal Data, is processed at the Company's operating offices and in any other places where the parties involved in the processing are located. It means that this information may be transferred to — and maintained on — computers located outside of Your state, province, country or other governmental jurisdiction where the data protection laws may differ than those from Your jurisdiction.</p>
<p>Your consent to this Privacy Policy followed by Your submission of such information represents Your agreement to that transfer.</p>
<p>The Company will take all steps reasonably necessary to ensure that Your data is treated securely and in accordance with this Privacy Policy and no transfer of Your Personal Data will take place to an organization or a country unless there are adequate controls in place including the security of Your data and other personal information.</p>
<h3>Delete Your Personal Data</h3>
<p>You have the right to delete or request that We assist in deleting the Personal Data that We have collected about You.</p>
<p>Our Service may give You the ability to delete certain information about You from within the Service.</p>
<p>You may update, amend, or delete Your information at any time by signing in to Your Account, if You have one, and visiting the account settings section that allows You to manage Your personal information. You may also contact Us to request access to, correct, or delete any personal information that You have provided to Us.</p>
<p>Please note, however, that We may need to retain certain information when We have a legal obligation or lawful basis to do so.</p>
<h3>Disclosure of Your Personal Data</h3>
<h4>Business Transactions</h4>
<p>If the Company is involved in a merger, acquisition or asset sale, Your Personal Data may be transferred. We will provide notice before Your Personal Data is transferred and becomes subject to a different Privacy Policy.</p>
<h4>Law enforcement</h4>
<p>Under certain circumstances, the Company may be required to disclose Your Personal Data if required to do so by law or in response to valid requests by public authorities (e.g. a court or a government agency).</p>
<h4>Other legal requirements</h4>
<p>The Company may disclose Your Personal Data in the good faith belief that such action is necessary to:</p>
<ul>
<li>Comply with a legal obligation</li>
<li>Protect and defend the rights or property of the Company</li>
<li>Prevent or investigate possible wrongdoing in connection with the Service</li>
<li>Protect the personal safety of Users of the Service or the public</li>
<li>Protect against legal liability</li>
</ul>
<h3>Security of Your Personal Data</h3>
<p>The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security.</p>
        </section>
        <section className={styles.section}>
          <h2>Detailed Information on the Processing of Your Personal Data</h2>
          <p>The Service Providers We use may have access to Your Personal Data. These third-party vendors collect, store, use, process and transfer information about Your activity on Our Service in accordance with their Privacy Policies.</p>

          <h3>Authentication</h3>
          <p>We may use minimal third-party services for authentication, diagnostics, and security monitoring only (e.g., Firebase Authentication). These are not used for targeted advertising, personalization, or sale of information.</p>
<ul>
<li>
<p><strong>Firebase Authentication</strong></p>
<p>Firebase Authentication is a secure authentication service provided by Google Inc., enabling users to sign in to apps using passwords, phone numbers, and popular federated identity providers such as Google, Facebook, and more.</p>
<p>Your authentication information and data are handled in accordance with Google’s Privacy Policy. To learn more, please visit:
  <br />
  <a href="https://policies.google.com/privacy" rel="noopener noreferrer" target="_blank">Google's Privacy Policy</a></p>
<p>For details on how Google helps safeguard your data with Firebase, see:
  <br />
  <a href="https://firebase.google.com/support/privacy" rel="noopener noreferrer" target="_blank">Firebase's Privacy Policy</a></p>
<p>To better understand what types of information Firebase Authentication may collect and how that information is used when you interact with our app, review Google's documentation on “How Google uses information from sites or apps that use our services”:
  <br />
  <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer" target="_blank">Google Technologies Terms</a></p>
</li>
</ul>
<h3>Email Service</h3>
<p>We may use Email Service Providers to manage and send emails to You about the Service, Your Account, or other important updates and notices.</p>
<ul>
<li>
<p><strong>SendLayer</strong></p>
<p>Their Privacy Policy can be viewed at:
  <br />
  <a href="https://sendlayer.com/privacy-policy/" rel="noopener noreferrer" target="_blank">SendLayer's Privacy Policy</a></p>
</li>
</ul>
<h3>Payments/Contributions</h3>
<p>Users and contributors may choose to support the development of the Service through paid contributions. In that case, We may use third-party services for payment processing (e.g. payment processors).</p>
<p>We will not store or collect Your payment card details. That information is provided directly to Our third-party payment processors whose use of Your personal information is governed by their Privacy Policy. These payment processors adhere to the standards set by PCI-DSS as managed by the PCI Security Standards Council, which is a joint effort of brands like Visa, Mastercard, American Express and Discover. PCI-DSS requirements help ensure the secure handling of payment information.</p>
<ul>
<li>
<p><strong>Open Collective</strong></p>
<p>Their Privacy Policy can be viewed at:
  <br />
  <a href="https://opencollective.com/privacypolicy" rel="external nofollow noopener" target="_blank">Open Collective's Privacy Policy</a></p>
</li>
</ul>
<h3>Usage, Performance and Miscellaneous</h3>
<p>We may use third-party Service Providers to provide, maintain, and improve Our Service.</p>
<ul>
<li>
<p><strong>Cloudflare</strong></p>
<p>Their Privacy Policy can be viewed at:
  <br />
  <a href="https://www.cloudflare.com/privacypolicy/" rel="external nofollow noopener" target="_blank">Cloudflare's Privacy Policy</a></p>
</li>
<li>
<p><strong>Infinity</strong></p>
<p>Their Privacy Policy can be viewed at:
  <br />
  <a href="https://startinfinity.com/privacy-policy" rel="external nofollow noopener" target="_blank">Infinity's Privacy Policy</a></p>
</li>
</ul>                
<h3>Sensitive Data</h3>
<p>Striae does not collect, process, or disclose sensitive forensic case data for external use. All Data remains encrypted and under User control.</p>
<h3>Children's Privacy</h3>
<p>The Service is only available to individuals 18 years and older who are employed at a forensic laboratory or related company. We do not knowingly collect data from minors.</p>
        </section>
        <section className={styles.section}>          
          <h2>CCPA/CPRA Privacy Notice</h2>
<p>This privacy notice section for California residents supplements the information contained in Our Privacy Policy and it applies solely to all visitors, users, and others who reside in the State of California.</p>
<h3>Categories of Personal Information Collected</h3>
<p>We collect information that identifies, relates to, describes, references, is capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular Consumer or Device. The following is a list of categories of personal information which We may collect or may have been collected from California residents within the last twelve (12) months.</p>
<p>Please note that the categories and examples provided in the list below are those defined in the CCPA/CPRA. This does not mean that all examples of that category of personal information were in fact collected by Us, but reflects Our good faith belief to the best of Our knowledge that some of that information from the applicable category may be and may have been collected. For example, certain categories of personal information would only be collected if You provided such personal information directly to Us.</p>
<ul>
<li>
<p><strong>Category A: Identifiers.</strong></p>
<p>Examples: A real name, alias, postal address, unique personal identifier, online identifier, Internet Protocol address, email address, account name, driver's license number, passport number, or other similar identifiers.</p>
<p>Collected: Yes.</p>
</li>
<li>
<p><strong>Category B: Personal information categories listed in the California Customer Records statute (Cal. Civ. Code § 1798.80(e)).</strong></p>
<p>Examples: A name, signature, Social Security number, physical characteristics or description, address, telephone number, passport number, driver's license or state identification card number, insurance policy number, education, employment, employment history, bank account number, credit card number, debit card number, or any other financial information, medical information, or health insurance information. Some personal information included in this category may overlap with other categories.</p>
<p>Collected: Yes.</p>
</li>
<li>
<p><strong>Category C: Protected classification characteristics under California or federal law.</strong></p>
<p>Examples: Age (40 years or older), race, color, ancestry, national origin, citizenship, religion or creed, marital status, medical condition, physical or mental disability, sex (including gender, gender identity, gender expression, pregnancy or childbirth and related medical conditions), sexual orientation, veteran or military status, genetic information (including familial genetic information).</p>
<p>Collected: No.</p>
</li>
<li>
<p><strong>Category D: Commercial information.</strong></p>
<p>Examples: Records and history of products or services purchased or considered.</p>
<p>Collected: No.</p>
</li>
<li>
<p><strong>Category E: Biometric information.</strong></p>
<p>Examples: Genetic, physiological, behavioral, and biological characteristics, or activity patterns used to extract a template or other identifier or identifying information, such as, fingerprints, faceprints, and voiceprints, iris or retina scans, keystroke, gait, or other physical patterns, and sleep, health, or exercise data.</p>
<p>Collected: No.</p>
</li>
<li>
<p><strong>Category F: Internet or other similar network activity.</strong></p>
<p>Examples: Interaction with Our Service or advertisement.</p>
<p>Collected: Yes.</p>
</li>
<li>
<p><strong>Category G: Geolocation data.</strong></p>
<p>Examples: Approximate physical location.</p>
<p>Collected: Yes.</p>
</li>
<li>
<p><strong>Category H: Sensory data.</strong></p>
<p>Examples: Audio, electronic, visual, thermal, olfactory, or similar information.</p>
<p>Collected: No.</p>
</li>
<li>
<p><strong>Category I: Professional or employment-related information.</strong></p>
<p>Examples: Current or past job history or performance evaluations.</p>
<p>Collected: Yes.</p>
</li>
<li>
<p><strong>Category J: Non-public education information (per the Family Educational Rights and Privacy Act (20 U.S.C. Section 1232g, 34 C.F.R. Part 99)).</strong></p>
<p>Examples: Education records directly related to a student maintained by an educational institution or party acting on its behalf, such as grades, transcripts, class lists, student schedules, student identification codes, student financial information, or student disciplinary records.</p>
<p>Collected: No.</p>
</li>
<li>
<p><strong>Category K: Inferences drawn from other personal information.</strong></p>
<p>Examples: Profile reflecting a person's preferences, characteristics, psychological trends, predispositions, behavior, attitudes, intelligence, abilities, and aptitudes.</p>
<p>Collected: No.</p>
</li>
<li>
<p><strong>Category L: Sensitive personal information.</strong></p>
<p>Examples: Account login and password information, geolocation data.</p>
<p>Collected: Yes.</p>
</li>
</ul>
<p>Under CCPA/CPRA, personal information does not include:</p>
<ul>
<li>Publicly available information from government records</li>
<li>Deidentified or aggregated consumer information</li>
<li>Information excluded from the CCPA/CPRA's scope, such as:
<ul>
<li>Health or medical information covered by the Health Insurance Portability and Accountability Act of 1996 (HIPAA) and the California Confidentiality of Medical Information Act (CMIA) or clinical trial data</li>
<li>Personal Information covered by certain sector-specific privacy laws, including the Fair Credit Reporting Act (FRCA), the Gramm-Leach-Bliley Act (GLBA) or California Financial Information Privacy Act (FIPA), and the Driver's Privacy Protection Act of 1994</li>
</ul>
</li>
</ul>
<h3>Sources of Personal Information</h3>
<p>We obtain the categories of personal information listed above from the following categories of sources:</p>
<ul>
<li><strong>Directly from You</strong>. For example, from the forms You complete on Our Service, preferences You express or provide through Our Service, or from Your purchases on Our Service.</li>
<li><strong>Indirectly from You</strong>. For example, from observing Your activity on Our Service.</li>
<li><strong>Automatically from You</strong>. For example, through cookies We or Our Service Providers set on Your Device as You navigate through Our Service.</li>
<li><strong>From Service Providers</strong>. For example, third-party vendors to monitor and analyze the use of Our Service, third-party vendors for payment processing,  or other third-party vendors that We use to provide the Service to You.</li>
</ul>
<h3>Use of Personal Information</h3>
<p>We may use or disclose personal information We collect for &quot;business purposes&quot; or &quot;commercial purposes&quot; (as defined under the CCPA/CPRA), which may include the following examples:</p>
<ul>
<li>To operate Our Service and provide You with Our Service.</li>
<li>To provide You with support and to respond to Your inquiries, including to investigate and address Your concerns and monitor and improve Our Service.</li>
<li>To fulfill or meet the reason You provided the information. For example, if You share Your contact information to ask a question about Our Service, We will use that personal information to respond to Your inquiry. If You provide Your personal information to purchase a product or service, We will use that information to process Your payment and facilitate delivery.</li>
<li>To respond to law enforcement requests and as required by applicable law, court order, or governmental regulations.</li>
<li>As described to You when collecting Your personal information or as otherwise set forth in the CCPA/CPRA.</li>
<li>For internal administrative and auditing purposes.</li>
<li>To detect security incidents and protect against malicious, deceptive, fraudulent or illegal activity, including, when necessary, to prosecute those responsible for such activities.</li>
<li>Only minimal Identifiers (email, name, employment verification) and Internet Activity (usage logs for support/security) may be collected.</li>
<li>Categories such as commercial information, payment details, or social/media identifiers do not apply.</li>
<li>Other one-time uses.</li>
</ul>
<p>Please note that the examples provided above are illustrative and not intended to be exhaustive. For more details on how We use this information, please refer to the &quot;Use of Your Personal Data&quot; section.</p>
<p>If We decide to collect additional categories of personal information or use the personal information We collected for materially different, unrelated, or incompatible purposes We will update this Privacy Policy.</p>
<h3>No Sale of Personal Information</h3>
<p>Striae does not sell or share Personal Information as defined by CCPA/CPRA, including for interest-based advertising.</p>
<h3>Disclosure of Personal Information</h3>
<p>We may use or disclose and may have used or disclosed in the last twelve (12) months the following categories of personal information for business or commercial purposes:</p>
<ul>
<li>Category A: Identifiers</li>
<li>Category B: Personal information categories listed in the California Customer Records statute (Cal. Civ. Code § 1798.80(e))</li>
<li>Category D: Commercial information</li>
<li>Category F: Internet or other similar network activity</li>
</ul>
<p>Please note that the categories listed above are those defined in the CCPA/CPRA. This does not mean that all examples of that category of personal information were in fact disclosed, but reflects Our good faith belief to the best of Our knowledge that some of that information from the applicable category may be and may have been disclosed.</p>
<p>When We disclose personal information for a business purpose or a commercial purpose, We enter a contract that describes the purpose and requires the recipient to both keep that personal information confidential and not use it for any purpose except performing the contract.</p>
<h3>Share of Personal Information</h3>
<p>We may share, and have shared in the last twelve (12) months, Your personal information identified in the above categories with the following categories of third parties:</p>
<ul>
<li>Service Providers</li>
<li>Payment processors</li>
<li>Our affiliates</li>
<li>Our business partners</li>
<li>Third party vendors to whom You or Your agents authorize Us to disclose Your personal information in connection with products or services We provide to You</li>
</ul>
<h3>Sale of Personal Information</h3>
<p>As defined in the CCPA/CPRA, &quot;sell&quot; and &quot;sale&quot; mean selling, renting, releasing, disclosing, disseminating, making available, transferring, or otherwise communicating orally, in writing, or by electronic or other means, a Consumer's personal information by the Business to a third party for valuable consideration. This means that We may have received some kind of benefit in return for sharing personal information, but not necessarily a monetary benefit.</p>
<p>We do not sell personal information as the term sell is commonly understood. We do allow Service Providers to use Your personal information for the business purposes described in Our Privacy Policy, for activities such as advertising, marketing, and analytics, and these may be deemed a sale under CCPA/CPRA.</p>
<p>We may sell and may have sold in the last twelve (12) months the following categories of personal information:</p>
<ul>
<li>Category A: Identifiers</li>
<li>Category B: Personal information categories listed in the California Customer Records statute (Cal. Civ. Code § 1798.80(e))</li>
<li>Category D: Commercial information</li>
<li>Category F: Internet or other similar network activity</li>
</ul>
<p>Please note that the categories listed above are those defined in the CCPA/CPRA. This does not mean that all examples of that category of personal information were in fact sold, but reflects Our good faith belief to the best of Our knowledge that some of that information from the applicable category may be and may have been shared for value in return.</p>
<h3>Sale of Personal Information of Minors Under 16 Years of Age</h3>
<p>We do not knowingly collect personal information from minors under the age of 16 through Our Service, although certain third party websites that We link to may do so. These third-party websites have their own terms of use and privacy policies and We encourage parents and legal guardians to monitor their children's Internet usage and instruct their children to never provide information on other websites without their permission.</p>
<p>We do not sell the personal information of Consumers We actually know are less than 16 years of age, unless We receive affirmative authorization (the &quot;right to opt-in&quot;) from either the Consumer who is between 13 and 16 years of age, or the parent or guardian of a Consumer less than 13 years of age. Consumers who opt-in to the sale of personal information may opt-out of future sales at any time. To exercise the right to opt-out, You (or Your authorized representative) may submit a request to Us by contacting Us.</p>
<p>If You have reason to believe that a child under the age of 13 (or 16) has provided Us with personal information, please contact Us with sufficient detail to enable Us to delete that information.</p>
<h3>Your Rights under the CCPA/CPRA</h3>
<p>The CCPA/CPRA provides California residents with specific rights regarding their personal information. If You are a resident of California, You have the following rights:</p>
<ul>
<li><strong>The right to notice.</strong> You have the right to be notified which categories of Personal Data are being collected and the purposes for which the Personal Data is being used.</li>
<li><strong>The right to know/access.</strong> Under CCPA/CPRA, You have the right to request that We disclose information to You about Our collection, use, sale, disclosure for business purposes and share of personal information. Once We receive and confirm Your request, We will disclose to You:
<ul>
<li>The categories of personal information We collected about You</li>
<li>The categories of sources for the personal information We collected about You</li>
<li>Our business or commercial purposes for collecting or selling that personal information</li>
<li>The categories of third parties with whom We share that personal information</li>
<li>The specific pieces of personal information We collected about You</li>
<li>If We sold Your personal information or disclosed Your personal information for a business purpose, We will disclose to You:
<ul>
<li>The categories of personal information categories sold</li>
<li>The categories of personal information categories disclosed</li>
</ul>
</li>
</ul>
</li>
<li><strong>The right to say no to the sale or sharing of Personal Data (opt-out).</strong> You have the right to direct Us to not sell Your personal information. To submit an opt-out request, please see the &quot;Do Not Sell My Personal Information&quot; section or contact Us.</li>
<li><strong>The right to correct Personal Data.</strong> You have the right to correct or rectify any inaccurate personal information about You that We collected. Once We receive and confirm Your request, We will use commercially reasonable efforts to correct (and direct Our Service Providers to correct) Your personal information, unless an exception applies.</li>
<li><strong>The right to limit use and disclosure of sensitive Personal Data.</strong> You have the right to request to limit the use or disclosure of certain sensitive personal information We collected about You, unless an exception applies. To submit, please see the &quot;Limit the Use or Disclosure of My Sensitive Personal Information&quot; section or contact Us.</li>
<li><strong>The right to delete Personal Data.</strong> You have the right to request the deletion of Your Personal Data under certain circumstances, subject to certain exceptions. Once We receive and confirm Your request, We will delete (and direct Our Service Providers to delete) Your personal information from Our records, unless an exception applies. We may deny Your deletion request if retaining the information is necessary for Us or Our Service Providers to:
<ul>
<li>Complete the transaction for which We collected the personal information, provide a good or service that You requested, take actions reasonably anticipated within the context of Our ongoing business relationship with You, or otherwise perform Our contract with You.</li>
<li>Detect security incidents, protect against malicious, deceptive, fraudulent, or illegal activity, or prosecute those responsible for such activities.</li>
<li>Debug products to identify and repair errors that impair existing intended functionality.</li>
<li>Exercise free speech, ensure the right of another consumer to exercise their free speech rights, or exercise another right provided for by law.</li>
<li>Comply with the California Electronic Communications Privacy Act (Cal. Penal Code § 1546 et. seq.).</li>
<li>Engage in public or peer-reviewed scientific, historical, or statistical research in the public interest that adheres to all other applicable ethics and privacy laws, when the information's deletion may likely render impossible or seriously impair the research's achievement, if You previously provided informed consent.</li>
<li>Enable solely internal uses that are reasonably aligned with consumer expectations based on Your relationship with Us.</li>
<li>Comply with a legal obligation.</li>
<li>Make other internal and lawful uses of that information that are compatible with the context in which You provided it.</li>
</ul>
</li>
<li><strong>The right not to be discriminated against.</strong> You have the right not to be discriminated against for exercising any of Your consumer's rights, including by:
<ul>
<li>Denying goods or services to You</li>
<li>Charging different prices or rates for goods or services, including the use of discounts or other benefits or imposing penalties</li>
<li>Providing a different level or quality of goods or services to You</li>
<li>Suggesting that You will receive a different price or rate for goods or services or a different level or quality of goods or services</li>
</ul>
</li>
</ul>
<h3>Exercising Your CCPA/CPRA Data Protection Rights</h3>
<p>Please see the &quot;Do Not Sell My Personal Information&quot; section and &quot;Limit the Use or Disclosure of My Sensitive Personal Information&quot; section for more information on how to opt out and limit the use of sensitive information collected.</p>
<p>Additionally, in order to exercise any of Your rights under the CCPA/CPRA, and if You are a California resident, You can contact Us:</p>
<ul>
<li>
<p>By email: info@striae.org</p>
</li>
</ul>
<p>Only You, or a person registered with the California Secretary of State that You authorize to act on Your behalf, may make a verifiable request related to Your personal information.</p>
<p>Your request to Us must:</p>
<ul>
<li>Provide sufficient information that allows Us to reasonably verify You are the person about whom We collected personal information or an authorized representative</li>
<li>Describe Your request with sufficient detail that allows Us to properly understand, evaluate, and respond to it</li>
</ul>
<p>We cannot respond to Your request or provide You with the required information if We cannot:</p>
<ul>
<li>Verify Your identity or authority to make the request</li>
<li>And confirm that the personal information relates to You</li>
</ul>
<p>We will disclose and deliver the required information free of charge within 45 days of receiving Your verifiable request. The time period to provide the required information may be extended once by an additional 45 days when reasonably necessary and with prior notice.</p>
<p>Any disclosures We provide will only cover the 12-month period preceding the verifiable request's receipt.</p>
<p>For data portability requests, We will select a format to provide Your personal information that is readily usable and should allow You to transmit the information from one entity to another entity without hindrance.</p>
<h3>Do Not Sell My Personal Information</h3>
<p>As defined in the CCPA/CPRA, &quot;sell&quot; and &quot;sale&quot; mean selling, renting, releasing, disclosing, disseminating, making available, transferring, or otherwise communicating orally, in writing, or by electronic or other means, a Consumer's personal information by the Business to a third party for valuable consideration. This means that We may have received some kind of benefit in return for sharing personal information, but not necessarily a monetary benefit.</p>
<p>We do not sell personal information as the term sell is commonly understood. We do allow Service Providers to use Your personal information for the business purposes described in Our Privacy Policy, for activities such as advertising, marketing, and analytics, and these may be deemed a sale under CCPA/CPRA.</p>
<p>You have the right to opt-out of the sale of Your personal information. Once We receive and confirm a verifiable consumer request from You, We will stop selling Your personal information. To exercise Your right to opt-out, please contact Us.</p>
<p>The Service Providers We partner with (for example, Our analytics or advertising partners) may use technology on the Service that sells personal information as defined by the CCPA/CPRA law. If You wish to opt out of the use of Your personal information for interest-based advertising purposes and these potential sales as defined under CCPA/CPRA law, You may do so by following the instructions below.</p>
<p>Please note that any opt out is specific to the browser You use. You may need to opt out on every browser that You use.</p>
<h4>Website</h4>
<p>If applicable, click &quot;Privacy Preferences&quot;, &quot;Update Privacy Preferences&quot; or &quot;Do Not Sell My Personal Information&quot; buttons listed on the Service to review Your privacy preferences and opt out of cookies and other technologies that We may use. Please note that You will need to opt out from each browser that You use to access the Service.</p>
<p>Additionally, You can opt out of receiving ads that are personalized as served by Our Service Providers by following Our instructions presented on the Service:</p>
<ul>
<li>The NAI's opt-out platform:   
  <br />
  <a href="https://www.networkadvertising.org/choices/" rel="noopener noreferrer" target="_blank">NAI Opt-Out</a></li>
<li>The EDAA's opt-out platform:
  <br />
  <a href="https://www.youronlinechoices.com/" rel="noopener noreferrer" target="_blank">EDAA Opt-Out</a></li>
<li>The DAA's opt-out platform:
  <br />
  <a href="https://optout.aboutads.info/?c=2&amp;lang=EN" rel="noopener noreferrer" target="_blank">DAA Opt-Out</a></li>
</ul>
<p>The opt out will place a cookie on Your computer that is unique to the browser You use to opt out. If You change browsers or delete the cookies saved by Your browser, You will need to opt out again.</p>
<h4>Mobile Devices</h4>
<p>Your mobile device may give You the ability to opt out of the use of information about the apps You use in order to serve You ads that are targeted to Your interests:</p>
<ul>
<li>&quot;Opt out of Interest-Based Ads&quot; or &quot;Opt out of Ads Personalization&quot; on Android devices</li>
<li>&quot;Limit Ad Tracking&quot; on iOS devices</li>
</ul>
<p>You can also stop the collection of location information from Your mobile device by changing the preferences on Your mobile device.</p>
<h3>Limit the Use or Disclosure of My Sensitive Personal Information</h3>
<p>If You are a California resident, You have the right to limit the use and disclosure of Your sensitive personal information to that use which is necessary to perform the services or provide the goods reasonably expected by an average Consumer who requests such services or goods.</p>
<p>We collect, use and disclose sensitive personal information in ways that are necessary to provide the Service. For more information on how We use Your personal information, please see the &quot;Use of Your Personal Data&quot; section or contact Us.</p>

        </section>
        <section className={styles.section}>
<h2>&quot;Do Not Track&quot; Policy as Required by California Online Privacy Protection Act (CalOPPA)</h2>
<p>Our Service does not respond to Do Not Track signals.</p>
<p>However, some third party websites do keep track of Your browsing activities. If You are visiting such websites, You can set Your preferences in Your web browser to inform websites that You do not want to be tracked. You can enable or disable DNT by visiting the preferences or settings page of Your web browser.</p>
<h2>Your California Privacy Rights (California's Shine the Light law)</h2>
<p>Under California Civil Code Section 1798 (California's Shine the Light law), California residents with an established business relationship with Us can request information once a year about sharing their Personal Data with third parties for the third parties' direct marketing purposes.</p>
<p>If You'd like to request more information under the California Shine the Light law, and if You are a California resident, You can contact Us using the contact information provided below.</p>
<h2>California Privacy Rights for Minor Users (California Business and Professions Code Section 22581)</h2>
<p>California Business and Professions Code Section 22581 allows California residents under the age of 18 who are registered users of online sites, services or applications to request and obtain removal of content or information they have publicly posted.</p>
<p>To request removal of such data, and if You are a California resident, You can contact Us using the contact information provided below, and include the email address associated with Your account.</p>
<p>Be aware that Your request does not guarantee complete or comprehensive removal of content or information posted online and that the law may not permit or require removal in certain circumstances.</p>
<h2>Children's Privacy</h2>
<p>Our Service does not address anyone under the age of 13. We do not knowingly collect personally identifiable information from anyone under the age of 13. If You are a parent or guardian and You are aware that Your child has provided Us with Personal Data, please contact Us. If We become aware that We have collected Personal Data from anyone under the age of 13 without verification of parental consent, We take steps to remove that information from Our servers.</p>
<p>If We need to rely on consent as a legal basis for processing Your information and Your country requires consent from a parent, We may require Your parent's consent before We collect and use that information.</p>
<h2>Links to Other Websites</h2>
<p>Our Service may contain links to other websites that are not operated by Us. If You click on a third party link, You will be directed to that third party's site. We strongly advise You to review the Privacy Policy of every site You visit.</p>
<p>We have no control over and assume no responsibility for the content, privacy policies or practices of any third party sites or services.</p>
<h2>Changes to this Privacy Policy</h2>
<p>We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.</p>
<p>We will let You know via email and/or a prominent notice on Our Service, prior to the change becoming effective and update the &quot;Last updated&quot; date at the top of this Privacy Policy.</p>
<p>You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.</p>            
        </section>
        <section className={styles.section}>
          <h2>Contact Us</h2>
<p>If You have any questions about this Privacy Policy, You can contact Us:</p>
<ul>
<li>
<p>By email: info@striae.org</p>
</li>
<li>
<p>Legal Entity: The Stephenson Jack Lu Living Trust</p>
</li>
</ul>
        </section>
      </div>
    </div>
  );
}