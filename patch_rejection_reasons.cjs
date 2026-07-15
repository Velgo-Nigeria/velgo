const fs = require('fs');
let code = fs.readFileSync('pages/Activity.tsx', 'utf8');

const oldClientDeclined = `                                <>
                                    <option value="Found someone else">Found someone else</option>
                                    <option value="Price is too high">Price is too high</option>
                                    <option value="Timing doesn't work for me">Timing doesn't work for me</option>
                                    <option value="Worker profile doesn't match my needs">Worker profile doesn't match my needs</option>
                                </>`;

const newClientDeclined = `                                <>
                                    <option value="1. Hired Alternate Candidate: I have decided to proceed with another professional for this task.">1. Hired Alternate Candidate</option>
                                    <option value="2. Budget Constraints: The proposed cost exceeds my current budget for this project.">2. Budget Constraints</option>
                                    <option value="3. Scheduling Conflict: The professional's availability does not align with my required timeline.">3. Scheduling Conflict</option>
                                    <option value="4. Scope Mismatch: The professional's profile or expertise does not perfectly align with my specific requirements.">4. Scope Mismatch</option>
                                </>`;

const oldClientCancelled = `                                <>
                                    <option value="No longer need this service">No longer need this service</option>
                                    <option value="Created request by mistake">Created request by mistake</option>
                                    <option value="Found someone outside Velgo">Found someone outside Velgo</option>
                                </>`;

const newClientCancelled = `                                <>
                                    <option value="1. Project Cancelled: I no longer require this service to be completed.">1. Project Cancelled</option>
                                    <option value="2. Error in Request: The job request was created by mistake or contains incorrect details.">2. Error in Request</option>
                                    <option value="3. Sourced Externally: I have found a professional outside the Velgo platform.">3. Sourced Externally</option>
                                </>`;

const oldWorkerDeclined = `                                <>
                                    <option value="Fully booked at the moment">Fully booked at the moment</option>
                                    <option value="Job scope is outside my expertise">Job scope is outside my expertise</option>
                                    <option value="Location is too far">Location is too far</option>
                                    <option value="Price offered is too low">Price offered is too low</option>
                                </>`;

const newWorkerDeclined = `                                <>
                                    <option value="1. Schedule Capacity Exceeded: I am currently fully booked and cannot take on new projects.">1. Schedule Capacity Exceeded</option>
                                    <option value="2. Outside Expertise: The scope of this task falls outside my core professional expertise.">2. Outside Expertise</option>
                                    <option value="3. Location Constraints: The job location is too far from my standard service area.">3. Location Constraints</option>
                                    <option value="4. Budget Misalignment: The offered compensation is below my standard rate for this level of work.">4. Budget Misalignment</option>
                                </>`;

const oldWorkerCancelled = `                                <>
                                    <option value="Fully booked now">Fully booked now</option>
                                    <option value="Applied by mistake">Applied by mistake</option>
                                </>`;

const newWorkerCancelled = `                                <>
                                    <option value="1. Schedule Conflict Arisen: My schedule has changed and I am no longer available.">1. Schedule Conflict Arisen</option>
                                    <option value="2. Application Error: I applied for this task by mistake or misunderstood the requirements.">2. Application Error</option>
                                </>`;

if (code.includes('Worker profile doesn\'t match my needs')) {
    code = code.replace(oldClientDeclined, newClientDeclined);
    code = code.replace(oldClientCancelled, newClientCancelled);
    code = code.replace(oldWorkerDeclined, newWorkerDeclined);
    code = code.replace(oldWorkerCancelled, newWorkerCancelled);
    
    // Also update "Other" to "5. Other" or just "Other (Please specify)"
    code = code.replace('<option value="Other">Other</option>', '<option value="Other">Custom Reason (Please specify)</option>');

    fs.writeFileSync('pages/Activity.tsx', code);
    console.log("Updated Rejection Reasons");
} else {
    console.log("Not found");
}

