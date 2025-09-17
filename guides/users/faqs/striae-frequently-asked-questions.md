
## Table of Contents

1. [🔐 Login & Authentication](#-login--authentication)
2. [📊 Case Management](#-case-management)  
3. [🎯 Image Annotation](#-image-annotation)
4. [📄 PDF Generation](#-pdf-generation)
5. [👤 Account Deletion](#-account-deletion)
6. [🔧 Troubleshooting](#-troubleshooting)
7. [🛡️ Security & Best Practices](#️-security--best-practices)
8. [🚀 Getting Started Quickly](#-getting-started-quickly)

***

## 🔐 Login & Authentication

**Q: How do I log into Striae for the first time?**

A: When logging into Striae for the first time, new users follow a straightforward process designed to keep your account secure. First, you'll register by providing your work email, choosing a strong password, and filling in personal details like your name and lab or company information. It’s important to make sure your organization is entered correctly. You won’t be able to change it later, unless you contact support.

After registering, an important step is verifying your email—this confirms your identity and activates your account. Lastly, setting up two-factor authentication (MFA) with your mobile phone adds an additional security layer by requiring SMS verification codes each time you log in. This approach ensures that only authorized users can access sensitive forensic data.

**Q: What are the password requirements for Striae?**

A: For maximum security, Striae enforces strong password rules. Your password must be at least 10 characters long and include a mix of capital letters, numbers, and special characters such as !@#$%^&\*. This complexity helps protect your account from unauthorized access, aligning with industry best practices for safeguarding forensic and case data.

**Q: Why is two-factor authentication required?**

A: Two-factor authentication (MFA) is crucial because it significantly enhances your account’s security. With MFA enabled, even if someone knows your password, they cannot log in without also having access to your registered phone to receive SMS verification codes. Because Striae handles sensitive forensic information, complying with strict security standards is essential. MFA helps prevent unauthorized access and protects the integrity of your case management.

***

## 📊 Case Management

**Q: How do I start working on a new case?**

A: Getting started with a new case in Striae is simple and intuitive. Begin by using the case management panel on the left sidebar after logging in. You can either create a completely new case or load one you’ve worked on before. Once the case is active, upload images that relate to your evidence files. After your images are uploaded and selected, you can start adding detailed annotations. The “Image Notes” section is where you enter case-specific information and descriptive annotations, helping organize your evidence clearly and professionally.

**Q: What file formats does Striae support for images?**

A: Striae supports the most common and reliable image formats used in forensic documentation, including PNG and JPEG. PNG is recommended especially for screenshots or images requiring sharp detail, while JPEG is ideal for photographs with gradients or complex textures. The system also supports GIF, WEBP, and SVG formats. To maintain smooth operation, Striae suggests keeping image file sizes under 10MB to ensure quick uploads and efficient processing.

***

## 🎯 Image Annotation

**Q: What types of annotations can I add to my images?**

A: Striae offers a rich set of seven annotation tools designed specifically for firearms examination and forensic comparison. You can add case and item numbers to image corners for clear identification. Class characteristics allow you to document technical details like land impressions or primer shear. Index marks let you highlight the specific comparison point shown in the selected image using colorful borders or alphanumeric labels. The support level tool captures your analytical conclusion—whether the evidence supports identification, exclusion, or remains inconclusive. There’s also a confirmation field for adding reviewer signatures and dates in identifications. Finally, the additional notes tool enables you to record detailed observations that provide further context.

**Q: Can I preview my annotations before creating the PDF report?**

A: Absolutely! The annotation toolbar makes it easy to toggle each annotation type on or off in real time. This way, you can see exactly how your final PDF will look while you work, ensuring that everything is properly displayed according to your documentation needs before you generate the report.

**Q: What’s the difference between Color Index and Number/Letter Index?**

A: Both tools serve to visually mark comparison points, but they do so differently. The Color Index surrounds the entire image with a distinctive colored border, which makes it very clear and immediately recognizable. This method is recommended when you want strong visual emphasis. The Number/Letter Index displays alphanumeric identifiers above the image, which can be useful for referencing specific comparison areas more precisely in your notes. Both systems help maintain clarity and assist in peer review or courtroom presentation.

**Q: How do I use box annotations to highlight specific areas?**

A: Box annotations allow you to draw colored rectangular highlights directly on your images to emphasize specific areas of interest. First, click the Box tool in the annotation toolbar to activate box drawing mode. A color picker will appear, allowing you to select from multiple colors. Then simply click and drag on the image to draw a rectangular box around the area you want to highlight. You can delete boxes after creation by right-clicking or double-clicking them if you've made a mistake. This tool is particularly useful for pointing out specific striae, class characteristics, or other significant comparison points.

**Q: Can I use multiple colors for different box annotations on the same image?**

A: Yes! You can use multiple colors for different box annotations on the same image. Each time you activate the Box tool, you can select a different color from the color picker before drawing. This allows you to color-code different types of features—for example, you might use red boxes for aligned striae and blue boxes for firing pin impressions. All box annotations, regardless of color, are preserved in the PDF output with their exact colors and positions.

**Q: Can I remove or edit box annotations after I've drawn them?**

A: Absolutely! Box annotations are deletable after creation. Simply right-click or double-click on the box to delete it. You can also hide all box annotations using the Box tool button in the toolbar without permanently deleting them. They won't be visible in the PDF if the Box tool is toggled off, but they remain saved in your case for future reference.

**Q: Will my box annotations appear in the PDF report?**

A: Yes, all box annotations are preserved in the PDF output with the same colors and positions as shown on screen. Make sure the Box tool is toggled on in the annotation toolbar before generating your PDF to ensure the boxes appear in your report. The boxes will be displayed as colored rectangular overlays on your image, maintaining their exact placement and colors for professional documentation and presentation.

**Q: Is my original image edited to include the box annotations?**

A: No! Your original image remains unaltered. The box annotations are overlaid on the image in the canvas and during the PDF generation process, but they do *not* modify the original file. This means you can always revert to the unannotated image if needed. Striae does not edit or change your original images in any way, ensuring the integrity of your evidence files is maintained. This holds true for all annotation types, including case numbers, class characteristics, index marks, and support level indicators; they are stored in a separate data structure and rendered dynamically without altering the original images.

***

## 📄 PDF Generation

**Q: How do I generate a professional PDF report?**

A: Generating a polished, case-ready PDF with Striae is straightforward. First, make sure all your annotation data is complete and saved. Use the toolbar to enable only the annotations you wish to include in the report. Then click the Print icon, which initiates the generation process. It usually takes between 15 to 60 seconds, depending on the amount of data. The PDF automatically downloads with a smart, descriptive filename that reflects your case details, ready for printing or saving.

**Q: How does Striae decide what filename to give the PDF?**

A: Filenames are automatically generated to keep reports well-organized and easy to identify. If you’re making a comparison between two cases, the filename will include both case numbers and item identifiers, for example: `striae-report-2025-001-1A--2025-002-1B.pdf`. For single case reports, it uses the case and item numbers, like `striae-report-2025-001-1A.pdf`. When only the case number is available, it simplifies to `striae-report-2025-001.pdf`. If no case information exists, a timestamp-based filename ensures uniqueness. Invalid characters are automatically sanitized for compatibility.

**Q: What information is included in the PDF reports?**

A: Striae’s PDFs are professionally formatted to include everything necessary for thorough case documentation. You’ll find the current date and case details in the header. The main image is shown in full resolution, overlaid with selected annotations like case numbers, class characteristics, index marks, and your support level conclusion. Additional notes and observations appear if provided. For identifications, a confirmation signature area is included to meet documentation standards for technical review.

***

## 👤 Account Deletion

**Q: How do I delete my Striae account?**

A: To delete your account, go to your user profile page and click the red "Delete Striae Account" button. Deleting your account will permanently remove all your account data, including your user profile, cases, images, annotations, and files. The process is irreversible, so make sure you've archived or downloaded any reports or data you want to keep before proceeding.

**Q: What happens when I delete my account?**

A: Account deletion is comprehensive and permanent. All your account information is removed from our systems. Every case you've created is deleted along with all associated images, annotations, and data files. Your email address is also permanently disabled to prevent any future account creation with the same email. You'll receive a confirmation email once the deletion is complete.

**Q: Can I recover my account after deletion?**

A: No, account deletion is irreversible. Once you confirm the deletion, all your data is permanently removed from Striae's systems and cannot be recovered. If you think you might need your data later, be sure to download any important reports or export your case information before deleting your account.

**Q: Will I get a confirmation that my account was deleted?**

A: Yes, a confirmation email is sent to you confirming your account has been successfully deleted, and an administrative notification is sent to our support team. The email will include details about what was removed and will confirm that your email address has been disabled for future registrations.

**Q: How long does the deletion process take?**

A: Account deletion is immediate and typically completes within a few seconds. You'll receive the confirmation email shortly after the process finishes. The deletion includes removing all your cases, images, and files from our storage systems, so larger accounts may take slightly longer to process completely. Any multi-factor authentication phone numbers you used when you registered your account may take a few days to be disabled.

***

## 🔧 Troubleshooting

**Q: I see an error saying "Cannot generate PDF - no image selected." What should I do?**

A: This usually means you’ve tried to generate a PDF without selecting an image. To fix it, first confirm you’ve loaded a case that contains uploaded images. Then click on a specific image so it appears in the viewer. After verifying the image is visible, you can generate the PDF successfully.

**Q: Why aren’t my annotations appearing in my PDF report?**

A: If your annotations don’t show up, double-check that you’ve saved all your annotation data within the "Image Notes" panel. Also, ensure the correct annotation tools are toggled on in the toolbar before generating the PDF. Missing required fields or working on an unselected image can also cause this issue, so verify those carefully.

**Q: The PDF download isn’t starting after I click print. How do I fix that?**

A: This may be due to browser restrictions. First, check your browser’s settings to allow file downloads from the Striae site. Disable any pop-up blockers that might prevent automatic downloads. Clearing your browser cache can also solve this problem. If issues persist, try switching to a different browser—Chrome is generally recommended for best results.

**Q: Which browsers work best with Striae?**

A: For the smoothest experience, use Chrome, which offers the best performance and compatibility. Firefox is another solid choice with good support for modern web features. Microsoft Edge supports all Striae functionality as well. Safari works but with some advanced features possibly behaving differently.

***

## 🛡️ Security & Best Practices

**Q: How should I handle my login credentials securely?**

A: It’s best practice to use unique, strong passwords for your Striae account and not share them with anyone. A trusted password manager can help you generate and store complex passwords securely. Always log out when you finish your session, especially if you are on a shared or public computer. Regularly update your password to maintain account security.

**Q: What should be included in professional forensic documentation?**

A: Your documentation should follow your department’s standards for case numbering and use accurate, technical terminology for class characteristics. Detailed observations are essential for peer review, so include sufficient information to support your conclusions. When identifying evidence, enable the confirmation field to include a signature and review date. Use consistent indexing methods throughout the case for clarity.

**Q: How can I best organize my PDF reports?**

A: To maintain order, let Striae’s automatic filename generation handle your report naming consistently. Organize your reports into folders by case or date for easy retrieval. Keep backup copies in secure, backed-up storage that complies with your department’s retention policies. Maintaining version control with dated PDFs helps you track any changes over time.

***

## 🚀 Getting Started Quickly

**Q: What’s the fastest way to create my first report in Striae?**

A: A streamlined workflow to get your first report done is: Load your case, select the image to annotate, then click "Image Notes" to enter case and object information. Set the class type and indexing system, select your support level, add any necessary notes, and save. Use the toolbar to turn on your desired annotations, click the Print icon, then download your formatted PDF. This step-by-step method keeps things efficient and organized.

**Q: Does Striae offer technical support if I need help?**

A: Yes! The Striae support team is available to assist with any technical issues, questions about features, or troubleshooting. Don’t hesitate to reach out if you encounter problems or want to suggest improvements.

***

*Need additional help? Don't hesitate to reach out to our [support team](https://www.striae.org/support). We're here to ensure you have secure and seamless access to Striae's features.*
