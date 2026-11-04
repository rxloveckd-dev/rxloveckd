/**
 * Love CKD: daily copy of the clinic's Google Sheet into a private Drive folder.
 *
 * This is a separate script on purpose. The clinic web app runs as each staff member with narrow
 * permissions; adding Drive access there would make every user approve it again.
 * Setup steps are in the README (สำรองข้อมูลอัตโนมัติ).
 */
const SHEET_ID = 'วาง-ID-ของ-Google-Sheet-ตรงนี้';
const FOLDER_NAME = 'Love CKD สำรองข้อมูล';
const COPY_PREFIX = 'Love CKD สำรอง ';
const KEEP_DAYS = 30;
const RUN_AT_HOUR = 2;

/** Run once by hand: makes the first copy, then schedules one every night. */
function installDailyBackup() {
  backupNow();
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('backupNow').timeBased().everyDays(1).atHour(RUN_AT_HOUR).create();
  console.log(`ตั้งสำรองข้อมูลทุกวันเวลาประมาณ ${RUN_AT_HOUR}:00 น. แล้ว`);
}

/** A failure here reaches the owner as Google's trigger-failure email; old copies stay untouched. */
function backupNow() {
  const folder = backupFolder();
  const stamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const copy = DriveApp.getFileById(SHEET_ID).makeCopy(COPY_PREFIX + stamp, folder);
  console.log(`สำรองแล้ว: ${copy.getName()}`);
  removeOldCopies(folder);
}

function backupFolder() {
  const found = DriveApp.getFoldersByName(FOLDER_NAME);
  return found.hasNext() ? found.next() : DriveApp.createFolder(FOLDER_NAME);
}

/** Moves copies past KEEP_DAYS to the Drive trash. Only touches files this script named. */
function removeOldCopies(folder) {
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().startsWith(COPY_PREFIX) && file.getDateCreated().getTime() < cutoff) file.setTrashed(true);
  }
}
