const fs = require('fs');
let code = fs.readFileSync('pages/Activity.tsx', 'utf8');

const oldClick = `  const handleItemClick = (item: any) => {
    // 1. Is it a raw Task Post? (Identified by having a budget but no worker_id in the item root)
    if (item.budget !== undefined && !item.worker_id) {
        onViewTask(item.id);
        return;
    }

    // 2. Is it a Booking linked to a Task?
    if (item.task_id) {
        onViewTask(item.task_id);
        return;
    }

    // 3. Is it a Direct Hire? (No task_id)
    if (profile?.id === item.client_id) {
        onViewWorker(item.worker_id);
    } else {
        onViewWorker(item.client_id);
    }
  };`;

const newClick = `  const handleItemClick = (item: any) => {
    // 1. Is it a raw Task Post? (Identified by having a budget but no worker_id in the item root)
    if (item.budget !== undefined && !item.worker_id) {
        onViewTask(item.id);
        return;
    }

    // 2. Is it a Booking linked to a Task?
    if (item.task_id) {
        // If client is viewing applications for their task, go to worker profile
        if (profile?.id === item.client_id) {
            onViewWorker(item.worker_id);
        } else {
            // Worker viewing their application goes to task details
            onViewTask(item.task_id);
        }
        return;
    }

    // 3. Is it a Direct Hire? (No task_id)
    if (profile?.id === item.client_id) {
        onViewWorker(item.worker_id);
    } else {
        onViewWorker(item.client_id);
    }
  };`;

if (code.includes('onViewTask(item.task_id);')) {
    code = code.replace(oldClick, newClick);
    fs.writeFileSync('pages/Activity.tsx', code);
    console.log("Patched handleItemClick");
} else {
    console.log("Could not find old handleItemClick");
}
