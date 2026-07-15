const fs = require('fs');

let code = fs.readFileSync('pages/AdminDashboard.tsx', 'utf8');

const oldReasons = `<option value="">-- Choose rejection preset template --</option>
                    <option value="Photo of NIN slip is too blurry or captured in dark environment. Please upload a clear photo taken in daylight.">NIN photo too blurry/dark</option>
                    <option value="Name on the ID document does not match the Velgo registered profile name. Ensure you upload your own personal ID.">Name mismatch with profile</option>
                    <option value="Invalid document class. We require formal government IDs (NIN standard slip, Voter's Card, Driver's License, or Passport).">Invalid ID document class</option>
                    <option value="Only frontpage was uploaded but details are cutoff. Please upload a full-face scan of your NIN ID.">Cut-off scan boundaries</option>
                    <option value="The document looks like a photocopy but we require the original color plastic card or paper slip.">Photocopy instead of color slip</option>`;

const newReasons = `<option value="">-- Choose rejection preset template --</option>
                    <option value="Your submitted ID photo is blurry, obscured by glare, or captured in poor lighting. Please re-upload a crisp, clear photo taken in bright daylight.">1. Blurry / Poor Lighting</option>
                    <option value="The name on the ID document does not exactly match your Velgo registered profile name. We require your own valid personal ID to ensure platform security.">2. Name Mismatch</option>
                    <option value="Invalid document class. For security reasons, we strictly require formal Nigerian Government IDs (Standard NIN Slip, Permanent Voter's Card, Driver's License, or International Passport).">3. Invalid ID Type</option>
                    <option value="The ID scan is cut-off. Essential details such as your face, document number, or full name are outside the photo frame. Please upload a full-frame scan.">4. Cut-off Scan Boundaries</option>
                    <option value="The uploaded document appears to be a black-and-white photocopy or a digital screenshot. We require a photo of the original color physical card or original colored printout.">5. Photocopy / Screenshot</option>
                    <option value="The uploaded ID document appears to be expired. Please upload an active, unexpired government-issued identification.">6. Expired Document</option>
                    <option value="Your face on the ID document is not clearly visible or does not seem to match your profile picture. Please upload an ID with a clear facial portrait.">7. Facial Recognition Mismatch</option>
                    <option value="We detected signs of digital manipulation or forgery in the uploaded document. Your verification request has been rejected for security reasons.">8. Suspected Forgery / Manipulation</option>`;

if (code.includes(oldReasons)) {
    code = code.replace(oldReasons, newReasons);
    fs.writeFileSync('pages/AdminDashboard.tsx', code);
    console.log("Updated AdminDashboard rejection reasons.");
} else {
    console.log("Old reasons not found.");
}
