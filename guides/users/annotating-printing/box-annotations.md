# Box Annotation System

The Box Annotation system in Striae allows users to draw precise, color-coded rectangles on comparison images to highlight specific areas of interest. This powerful feature enhances documentation accuracy and provides visual context for findings in both the interface and generated PDF reports.

## Getting Started with Box Annotations

### Activating the Box Tool

1. **Open your case** and select an image for annotation
2. **Locate the toolbar** at the top of the interface
3. **Click the Box Annotation tool** - it will activate and highlight in the toolbar
4. **The color selector** will automatically appear when the box tool is active
5. **Select your desired color** from the color selector for your rectangles and click the green checkmark to confirm

### Drawing Box Annotations

1. **Position your cursor** over the area you want to annotate
2. **Click and drag** to create a rectangular box annotation
   - Start position: Click where you want one corner of the box
   - End position: Drag to where you want the opposite corner
3. **Release the mouse** to complete the box annotation
4. **The box will be saved automatically** with your selected color

### Color Selection

**Automatic Color Picker**: When you activate the box annotation tool, a color selector automatically appears with:

- **Preset color grid**: Quick access to commonly used forensic annotation colors
- **Custom color wheel**: Full spectrum color selection for specialized marking needs
- **Real-time preview**: See your color choice before applying it to annotations
- **Confirm/cancel options**: User-friendly workflow to approve or reset color selection

**Color Application**: Each new box annotation uses your currently selected color, allowing you to categorize different types of evidence or findings with distinct colors.

**If you want to change colors** for subsequent annotations, click the box tool twice to disable and re-enable it, which will bring up the color selector again. Choose a new color and continue annotating.

### Managing Box Annotations

**Removing Annotations**: You have two options to remove unwanted box annotations:

1. **Double-click method**: Double-click directly on any box annotation to remove it
2. **Right-click method**: Right-click on any box annotation to delete it immediately

**Visual Feedback**:

- Box annotations show hover effects when you position your cursor over them
- Tooltip guidance appears to remind you of removal options
- Clear visual indicators distinguish between drawing mode and interaction mode

### Box Annotation Visibility

**Toolbar Integration**: Box annotations have integrated visibility controls:

- **Annotations are visible** only when the box annotation tool is active
- **Toggle visibility** by activating/deactivating the box tool in the toolbar
- **Seamless workflow** allows you to focus on analysis without visual clutter when not needed

## Technical Features

### Precision and Accuracy

**Percentage-Based Coordinates**:

- Box annotations use percentage-based positioning for device-independent accuracy
- Annotations maintain precise positioning across different screen sizes and resolutions
- Pixel-perfect placement ensures consistency between interface and PDF output

**Real-Time Visual Feedback**:

- See your box annotations as you draw them
- Transparent styling keeps focus on the underlying evidence
- Colored borders provide clear delineation without obscuring image details

### Professional Integration

**Automatic Saving**:

- All box annotations are saved automatically to your case
- No manual save required - your work is preserved instantly
- Annotations persist when switching between images or cases

**State Management**:

- Box annotations maintain their position during case switching
- Annotations are preserved through application sessions
- Robust error handling protects against data loss

## PDF Report Integration

### Seamless Report Generation

**Automatic Inclusion**: When you generate a PDF report, box annotations are automatically included:

- **Exact positioning**: Box annotations appear in PDFs with precise placement matching the interface
- **Color consistency**: All colors are preserved in the final PDF document
- **Professional styling**: Transparent backgrounds with colored borders maintain document clarity

**Conditional Rendering**: Box annotations appear in PDF reports only when:

- The box annotation tool was active when the report was generated
- Annotations exist for the selected image
- This ensures clean reports when box annotations are not needed

## Best Practices

### Effective Annotation Strategies

**Color Coding System**:

- Establish consistent color meanings for your laboratory or unit
- Use distinct colors for different types of markings or characteristics
- Document your color coding system for team collaboration
- Use the additional notes section to clarify annotations

**Annotation Placement**:

- Draw boxes that encompass the full area of interest without excessive surrounding space
- Ensure boxes are large enough to be clearly visible in PDF reports
- Avoid overlapping boxes when possible for clarity

**Quality Control**:

- Review annotations before generating final reports
- Use the visibility toggle to check annotation placement without distraction
- Verify color choices align with your documentation standards

## Troubleshooting

### Common Issues and Solutions

**Box Not Appearing**:

- Verify the box annotation tool is active (highlighted in toolbar)
- Ensure you're clicking and dragging, not just clicking
- Check that your box is large enough (minimum 1% of image size)

**Color Selector Not Visible**:

- The color selector only appears when the box annotation tool is active
- Click the box tool in the toolbar to activate it
- Refresh the page if the color selector doesn't appear

**Annotations Not in PDF**:

- Ensure the box annotation tool was active when generating the PDF
- Verify annotations exist for the selected image

**Performance Considerations**:

- Large numbers of annotations may affect rendering performance
- Consider using fewer, more strategic annotations for optimal performance
- Complex annotation patterns may increase PDF generation time

## Security and Privacy

### Data Protection

**Automatic Encryption**: All box annotation data is encrypted in transit and at rest using enterprise-grade security protocols.

**Access Control**: Box annotations are tied to your user account and case permissions, ensuring data privacy and proper access controls.

**Audit Trail**: All annotation activities are logged for accountability and compliance with forensic documentation standards.

---

*Need additional help? Don't hesitate to reach out to our [support team](https://www.striae.org/support). We're here to ensure you have secure and seamless access to Striae's features.*
