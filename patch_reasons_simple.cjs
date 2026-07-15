const fs = require('fs');
let code = fs.readFileSync('pages/Activity.tsx', 'utf8');

// Simplifications
code = code.replace(
  '<option value="1. Hired Alternate Candidate: I have decided to proceed with another professional for this task.">1. Hired Alternate Candidate</option>',
  '<option value="1. I have hired someone else for this job.">1. I have hired someone else.</option>'
);
code = code.replace(
  '<option value="2. Budget Constraints: The proposed cost exceeds my current budget for this project.">2. Budget Constraints</option>',
  '<option value="2. Your price is higher than my budget.">2. Your price is higher than my budget.</option>'
);
code = code.replace(
  '<option value="3. Scheduling Conflict: The professional\'s availability does not align with my required timeline.">3. Scheduling Conflict</option>',
  '<option value="3. Our timing or schedules do not match.">3. Our timing or schedules do not match.</option>'
);
code = code.replace(
  '<option value="4. Scope Mismatch: The professional\'s profile or expertise does not perfectly align with my specific requirements.">4. Scope Mismatch</option>',
  '<option value="4. Your skills don\'t perfectly match what I need right now.">4. Skills don\'t perfectly match.</option>'
);

code = code.replace(
  '<option value="1. Project Cancelled: I no longer require this service to be completed.">1. Project Cancelled</option>',
  '<option value="1. I don\'t need this service anymore.">1. I don\'t need this service anymore.</option>'
);
code = code.replace(
  '<option value="2. Error in Request: The job request was created by mistake or contains incorrect details.">2. Error in Request</option>',
  '<option value="2. I made a mistake while creating this request.">2. Made a mistake creating request.</option>'
);
code = code.replace(
  '<option value="3. Sourced Externally: I have found a professional outside the Velgo platform.">3. Sourced Externally</option>',
  '<option value="3. I found a worker outside this app.">3. Found a worker outside this app.</option>'
);

code = code.replace(
  '<option value="1. Schedule Capacity Exceeded: I am currently fully booked and cannot take on new projects.">1. Schedule Capacity Exceeded</option>',
  '<option value="1. I am fully booked and too busy right now.">1. I am fully booked and busy.</option>'
);
code = code.replace(
  '<option value="2. Outside Expertise: The scope of this task falls outside my core professional expertise.">2. Outside Expertise</option>',
  '<option value="2. This job is outside what I normally do.">2. Job is outside what I normally do.</option>'
);
code = code.replace(
  '<option value="3. Location Constraints: The job location is too far from my standard service area.">3. Location Constraints</option>',
  '<option value="3. The job location is too far for me.">3. The job location is too far.</option>'
);
code = code.replace(
  '<option value="4. Budget Misalignment: The offered compensation is below my standard rate for this level of work.">4. Budget Misalignment</option>',
  '<option value="4. The pay offered is too small for this work.">4. The pay offered is too small.</option>'
);

code = code.replace(
  '<option value="1. Schedule Conflict Arisen: My schedule has changed and I am no longer available.">1. Schedule Conflict Arisen</option>',
  '<option value="1. I am no longer free to do this job.">1. I am no longer free to do this job.</option>'
);
code = code.replace(
  '<option value="2. Application Error: I applied for this task by mistake or misunderstood the requirements.">2. Application Error</option>',
  '<option value="2. I applied for this job by mistake.">2. I applied for this job by mistake.</option>'
);

fs.writeFileSync('pages/Activity.tsx', code);
console.log("Patched Activity reasons to be simpler");
