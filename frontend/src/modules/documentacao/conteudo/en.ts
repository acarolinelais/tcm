import type { ConteudoGuia, SlugGuia } from "../model/guia";

export const en: Record<SlugGuia, ConteudoGuia> = {
  "getting-started": {
    titulo: "Getting started",
    resumo: "Sign in, change your password, pick a language and theme, and find your way around the menu.",
    secoes: [
      {
        titulo: "First sign-in",
        paragrafos: [
          "Your unit administrator creates your account with the team's default password. On your first sign-in the system asks you to choose a new one before you can go on.",
          "Forgot your password? Ask your unit administrator. They can reset it to the default, and you choose a new one at the next sign-in.",
        ],
      },
      {
        titulo: "Your account",
        itens: [
          "Change password: Settings, then Change password. You type the current password and the new one twice.",
          "Language: English, Portuguese or Korean, in the top bar or on the sign-in page. The choice is saved to your account and follows you on any computer.",
          "Theme: light or dark, in the top bar. The choice is saved in this browser.",
          "Avatar color: Settings. Your color shows on cards and lists wherever your name appears.",
        ],
      },
      {
        titulo: "The side menu",
        itens: [
          "Overview: charts and numbers for your work or, for managers, for the teams you lead.",
          "Board: the Kanban of a project, one column per Test Case status.",
          "Timeline: who changed which Test Case and when, by day, week or month.",
          "General Results: Form Factor results per device and date.",
          "Projects: the projects of your teams and their Test Cases.",
          "Administration: users, sectors, teams, profiles and permissions, audit and device models. Each item shows only for the roles that use it.",
          "Documentation and Settings: these guides and your account.",
        ],
      },
      {
        titulo: "What you see",
        paragrafos: [
          "Every list shows only what your role and teams allow. If a project or person is missing, it is probably outside your scope. The Roles and permissions guide explains each role.",
        ],
      },
    ],
  },
  "status-cycle": {
    titulo: "Test Case status cycle",
    resumo: "What each status means, who moves a Test Case forward and when the system moves it for you.",
    secoes: [
      {
        titulo: "The expected flow",
        itens: [
          "To-Do: every new Test Case starts here.",
          "In Progress: the developer started working on it.",
          "In Review: the pull request was sent.",
          "In Validation: the pull request was approved and the case waits for Form Factor results.",
          "Done: every device of the project passed.",
          "In Fixes: some device failed. After the fix, the developer sends a new pull request and the case goes back to In Review.",
          "Excluded: the case cannot be automated. It keeps its results and history.",
        ],
      },
      {
        titulo: "Who moves a Test Case",
        itens: [
          "Administrator, manager and Key Person move any case within their scope.",
          "The main assignee moves their own cases, to any status.",
          "The backup can only move the case to Excluded.",
          "Everyone else only reads.",
          "You change the status in the Test Cases table or by dragging the card on the Board. On the Board, the Move to action on each card does the same without a mouse.",
        ],
      },
      {
        titulo: "When the system moves it for you",
        paragrafos: [
          "Only a case in In Validation moves by itself, when results arrive from an SDF report or a test round:",
        ],
        itens: [
          "the latest result of every device is PASS: the case goes to Done;",
          "the result that just arrived is FAIL: the case goes to In Fixes;",
          "anything else, such as one device still without a result: the case stays in In Validation.",
        ],
      },
      {
        titulo: "Excluding a Test Case",
        paragrafos: [
          "Moving a case to Excluded asks for a justification of up to 500 characters. Anyone who sees the case can read it with View justification in the Notes column. If the case leaves Excluded, the justification is cleared, and a new exclusion asks for a new one.",
        ],
      },
      {
        titulo: "Code done and End date",
        itens: [
          "Code done: the first time the case entered In Review.",
          "End date: the date of the run that completed PASS on every device of the project.",
          "The system sets both dates once and nobody edits them.",
        ],
      },
    ],
  },
  "status-and-situation": {
    titulo: "Status and Situation",
    resumo: "Status shows how far the work is. TC Situation shows how the case compares with earlier projects.",
    secoes: [
      {
        titulo: "Status: where the work is",
        paragrafos: [
          "Status tracks progress in this project and changes while the team works. The Test Case status cycle guide explains each step.",
        ],
      },
      {
        titulo: "TC Situation: where the case came from",
        paragrafos: ["TC Situation compares the case with earlier projects. It comes from the spreadsheet, rarely changes and does not affect the status: a New case and a Without Changes case both start in To-Do."],
        itens: [
          "New: a case that did not exist before.",
          "New Step: the case exists for another One UI version, but some execution step changed.",
          "Without Changes: the case exists in another project and only the One UI version changes.",
        ],
      },
    ],
  },
  "import-spreadsheet": {
    titulo: "Import a project from a spreadsheet",
    resumo: "Columns, accepted formats and the most common errors before you upload.",
    secoes: [
      {
        titulo: "Before you start",
        itens: [
          "Who: administrator, manager and Key Person, for teams in their scope.",
          "File: XLS or XLSX, up to 25 MB.",
          "Download the template on the upload page to start from the right columns.",
        ],
      },
      {
        titulo: "Required columns",
        itens: [
          "App and One UI: the first filled value of each names the project, as in \"Clock 9.5\". You can edit the name before creating it.",
          "TC ID: unique in the spreadsheet and in the project.",
          "Category: A, B or C.",
          "Difficulty: Low, Medium or High.",
          "TC Situation: New, New Step or Without Changes.",
          "Assignees and Backup: the person's name, email or User ID. Both must be active members of the chosen team and must be different people.",
        ],
      },
      {
        titulo: "Optional columns",
        itens: [
          "Automation Level: 1, 2 or 3.",
          "Title(English): up to 500 characters.",
          "Test Precondition(English), Test Procedure(English) and Expected Result(English): up to 10,000 characters each, line breaks kept.",
          "Column names ignore upper and lower case. A Status column is ignored: every case starts in To-Do.",
        ],
      },
      {
        titulo: "Preview and errors",
        paragrafos: [
          "After reading the file, the page shows a preview with the project name and every case. You can hide the preview to see the form better.",
          "If anything is wrong, nothing is created. Problems with the whole file come first, then problems per row, each with the row number, the column and the value found. Fix the spreadsheet, remove the file and upload it again.",
        ],
      },
      {
        titulo: "Common errors",
        itens: [
          "A required column is missing, or a header appears twice.",
          "A value outside the list, such as \"Hard\" in Difficulty.",
          "A TC ID repeated in another row.",
          "A person not found, found more than once, or not an active member of the team.",
        ],
      },
    ],
  },
  "sdf-report": {
    titulo: "SDF report",
    resumo: "File format, how results change the status and how to undo the last import.",
    secoes: [
      {
        titulo: "Who and where",
        paragrafos: [
          "Administrator, manager and Key Person with permission to import SDF reports, in projects within their scope. Use the Import SDF report button on General Results.",
        ],
      },
      {
        titulo: "What the system reads",
        itens: [
          "SDF ID: the file name up to the first \"_\". 123456-789012_0_Test_1_Detail.xlsx gives 123456-789012. Each SDF ID can be used once per project.",
          "Device: cell C4. It must be a device model of the project.",
          "Run date: cell F4 (Start Time), as month/day/year and time, like 10/21/2026 6:43:35 PM.",
          "Results: the table with headers on row 7. Script Name without .py is the TC ID, State is the result and Description is shown in the result details.",
          "One UI: taken from Test File Path, as in OneUI95 for 9.5. It must match the project.",
          "Rows for HQ_precondition.py and Setup.py are skipped.",
        ],
      },
      {
        titulo: "When the file is refused",
        paragrafos: [
          "Any error refuses the whole file and nothing is saved. The message lists the first five problems with their row or cell and how many more there are.",
        ],
      },
      {
        titulo: "How results change the status",
        itens: [
          "Only cases in In Validation change status, as described in the Test Case status cycle guide. For the others, the results only go to the history.",
          "FAIL counts only when it comes in this report. An older FAIL on another device does not move the case.",
          "Values other than PASS or FAIL, such as N/A, never change the status.",
        ],
      },
      {
        titulo: "Undo the last import",
        paragrafos: [
          "Undo last import removes the most recent import of the project after you confirm. Its results leave every screen. Cases it moved go back to In Validation, unless someone moved them afterwards. The End date is recalculated and the SDF ID can be used again. You can then undo the import before it, one at a time.",
        ],
      },
    ],
  },
  "general-results-form-factor": {
    titulo: "General Results and Form Factor",
    resumo: "Rounds, results per device and what each role sees.",
    secoes: [
      {
        titulo: "The table",
        itens: [
          "Each project is a tab with the app name.",
          "Columns: TC ID, Assignee, Form Factor (device), SDF ID, the five most recent run dates and Actions.",
          "A collapsed row shows the first device. The arrow next to the row number shows every device of the project.",
          "Click a result to see its details. View execution history in Actions lists every run of the case on every device.",
          "Use the week picker or a day filter to reach older dates.",
        ],
      },
      {
        titulo: "Who sees what",
        itens: [
          "Administrator, manager and Key Person see every active case of the projects in their scope.",
          "A developer sees only the cases where they are the assignee or the backup.",
        ],
      },
      {
        titulo: "Test rounds",
        paragrafos: [
          "Create test round captures every Test Case currently in In Validation. Results are recorded per device with Record result in Actions, by management or by the case's assignee or backup. The SDF ID of a round is optional, but it cannot repeat in the project.",
          "Recorded results move cases as described in the Test Case status cycle guide.",
        ],
      },
      {
        titulo: "The Form Factor tab of a project",
        paragrafos: [
          "Inside a project, the Form Factor tab shows the same table for that project only. The Import SDF report and Undo last import buttons stay on General Results.",
        ],
      },
    ],
  },
  "closed-projects": {
    titulo: "Closed projects",
    resumo: "When a project can be closed and how to show closed projects again.",
    secoes: [
      {
        titulo: "Open and closed",
        paragrafos: [
          "A project is closed when its status is Completed or Canceled. Created, To Do and In Progress are open.",
        ],
      },
      {
        titulo: "Completing a project",
        itens: [
          "A project becomes Completed only when every active Test Case is in Done or Excluded.",
          "If some case is still open, the system refuses and says how many are left.",
          "A project with no Test Cases can be completed.",
          "Canceling a project does not depend on its Test Cases.",
          "You can change the status back later on the Projects page.",
        ],
      },
      {
        titulo: "Where closed projects show",
        itens: [
          "Board, Timeline and General Results list only open projects.",
          "Turn on Closed projects on those pages to see them too. The filter is off every time the page opens.",
          "Projects always lists every project, because that is where the status changes.",
          "A direct link to a closed project still opens it.",
        ],
      },
    ],
  },
  "board-and-timeline": {
    titulo: "Board and Timeline",
    resumo: "Filters and how to read the columns and the grid.",
    secoes: [
      {
        titulo: "Board",
        itens: [
          "With one team, you go straight to the Kanban of your last project. With more teams, pick a project on a team card.",
          "There is one column per status, with the number of cases in each.",
          "Each card shows the TC ID, Category, Difficulty, TC Situation and the assignee.",
          "Drag a card to change its status, or use Move to on the card. Cards you cannot move cannot be dragged.",
          "Filter by assignee, status, Category, Difficulty and TC Situation, or search by TC ID. Filters stay in the page address, so a shared link keeps them.",
          "Developers see every case of the project here, not only their own.",
        ],
      },
      {
        titulo: "Timeline",
        itens: [
          "Pick a project and a view: Day, Week or Month.",
          "A card groups the changes to one Test Case on one day, with its current assignee.",
          "Click a card to see each change: field, before and after, who made it and when.",
          "Filter by assignee or by Test Case. A vertical line marks the current time.",
          "The Timeline is read-only.",
        ],
      },
    ],
  },
  "roles-and-permissions": {
    titulo: "Roles and permissions",
    resumo: "What the administrator, manager, Key Person and developer can do.",
    secoes: [
      {
        titulo: "Administrator",
        itens: [
          "Sees and changes everything in the unit.",
          "Manages users, sectors, teams and profiles, and resets passwords.",
          "Opens the Audit page.",
        ],
      },
      {
        titulo: "Manager",
        itens: [
          "Works with the teams of the sectors they manage and the teams they belong to.",
          "Creates and manages projects, Test Cases, users and teams in that scope.",
          "Creates test rounds and imports SDF reports.",
        ],
      },
      {
        titulo: "Key Person (KP)",
        itens: [
          "Works only with the teams they belong to.",
          "Creates and manages projects and Test Cases of those teams, and manages team members.",
          "Creates test rounds, imports SDF reports and manages device models.",
        ],
      },
      {
        titulo: "Developer",
        itens: [
          "Sees the projects of their teams.",
          "Changes the status of the cases where they are the main assignee, and can exclude the cases where they are the backup.",
          "Records test round results for the cases where they are the assignee or the backup.",
          "Sees every case on the Board, but only their own cases on Projects and General Results.",
        ],
      },
      {
        titulo: "Your unit may differ",
        paragrafos: [
          "The administrator can adjust the permissions of each profile on the Profiles and permissions page, so your unit may differ a little from this list.",
        ],
      },
    ],
  },
  "export-tables": {
    titulo: "Export tables to Excel",
    resumo: "Export the current page or every item, with the filters you applied.",
    secoes: [
      {
        titulo: "How to export",
        itens: [
          "Use Export at the bottom of the table.",
          "Current page: the rows you see, in the same order.",
          "All items: every page, with the same filters.",
        ],
      },
      {
        titulo: "What comes in the file",
        itens: [
          "The same columns and titles as the table, in your language.",
          "Readable values: translated status and names instead of codes.",
          "Only what you can already see.",
          "The file is named after the list and the date, such as usuarios_2026-10-29.xlsx.",
          "An empty table cannot be exported.",
        ],
      },
    ],
  },
  audit: {
    titulo: "Audit",
    resumo: "Who changed what in a Test Case, and when.",
    secoes: [
      {
        titulo: "Where",
        paragrafos: ["Administration, then Audit. The page is for the administrator and is read-only."],
      },
      {
        titulo: "Each row",
        paragrafos: [
          "A row is one save: date and time, user, role, action, Test Case, project, a summary of the changes, origin and page. The action is Created, Changed, PR added or PR removed. When one save changes several fields, the summary shows the first one and \"+N\".",
          "Open a row to see every field that changed, as \"field: before → after\".",
        ],
      },
      {
        titulo: "Filters and export",
        itens: [
          "Period, user, role, action, Test Case, project, origin (API or Form Factor) and page.",
          "Filters combine, and changing one goes back to the first page.",
          "Export works as in every other table, with the filters applied. See Export tables to Excel.",
        ],
      },
    ],
  },
  glossary: {
    titulo: "Glossary",
    resumo: "TC, KP, SDF, Form Factor, Backup, Pass Rate and other terms.",
    secoes: [
      {
        titulo: "Terms",
        itens: [
          "TC (Test Case): one test to automate. Its TC ID, such as Clock_0001, is unique within a project.",
          "Assignee: the main person responsible for a Test Case.",
          "Backup: the second person on a Test Case. They can exclude it, and the assignee can hand the case over to them.",
          "KP (Key Person): the person who manages a team's work.",
          "One UI: the software version a project targets, such as 9.5.",
          "Device (model): a phone or tablet model the project is tested on.",
          "Form Factor: the device dimension of the results, one result per device.",
          "SDF: the tool that runs the tests and exports the report.",
          "SDF ID: the identifier of an SDF run, taken from the report file name.",
          "Test round: a set of Test Cases in validation that waits for results.",
          "PASS and FAIL: the result of a run on one device.",
          "Pass Rate: on the Overview, the share of PASS results per device in the latest test round of a project.",
          "Category: A, B or C.",
          "Difficulty: Low, Medium or High.",
          "TC Situation: New, New Step or Without Changes. See the Status and Situation guide.",
          "Automation Level: 1 not automatable, 2 partly automatable, 3 fully automatable.",
          "Code done and End date: see the Test Case status cycle guide.",
        ],
      },
    ],
  },
};
