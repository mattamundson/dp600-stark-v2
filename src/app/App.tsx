import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { DashboardView } from '../features/dashboard/DashboardView';
import { QuizView } from '../features/quiz/QuizView';
import { SingleQuestionView } from '../features/quiz/SingleQuestionView';
import { SimulationView } from '../features/simulation/SimulationView';
import { ScenarioView } from '../features/scenarios/ScenarioView';
import { FlashcardsView } from '../features/flashcards/FlashcardsView';
import { RemediationView } from '../features/remediation/RemediationView';
import { AnalyticsView } from '../features/analytics/AnalyticsView';
import { StudyPlanView } from '../features/study-plan/StudyPlanView';
import { ReferenceView } from '../features/reference/ReferenceView';
import { HistoryView } from '../features/history/HistoryView';
import { SettingsView } from '../features/settings/SettingsView';
import { DirectLakeMasteryView } from '../features/dashboard/DirectLakeMasteryView';
import { ComponentPickerView } from '../features/lab/ComponentPickerView';
import { KqlDrillView } from '../features/lab/KqlDrillView';
import { Last72HoursView } from '../features/cockpit/Last72HoursView';
import { SimulationViewV2 } from '../features/simulation/SimulationViewV2';
import { CheatSheetView } from '../features/cheat-sheet/CheatSheetView';
import { MissedPatternsView } from '../features/analytics/MissedPatternsView';
import { CalcGroupsLabView } from '../features/lab/CalcGroupsLabView';
import { StarSchemaLabView } from '../features/lab/StarSchemaLabView';
import { DayStudyView } from '../features/study-docs/DayStudyView';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardView />} />
        <Route path="/quiz" element={<QuizView />} />
        <Route path="/q/:id" element={<SingleQuestionView />} />
        <Route path="/simulation" element={<SimulationView />} />
        <Route path="/scenarios" element={<ScenarioView />} />
        <Route path="/scenarios/:id" element={<ScenarioView />} />
        <Route path="/flashcards" element={<FlashcardsView />} />
        <Route path="/remediation" element={<RemediationView />} />
        <Route path="/analytics" element={<AnalyticsView />} />
        <Route path="/study-plan" element={<StudyPlanView />} />
        <Route path="/reference" element={<ReferenceView />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/history/:sessionId" element={<HistoryView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/mastery/direct-lake" element={<DirectLakeMasteryView />} />
        <Route path="/lab/component-picker" element={<ComponentPickerView />} />
        <Route path="/lab/kql-drill" element={<KqlDrillView />} />
        <Route path="/cockpit" element={<Last72HoursView />} />
        <Route path="/simulation-v2" element={<SimulationViewV2 />} />
        <Route path="/cheat-sheet" element={<CheatSheetView />} />
        <Route path="/missed" element={<MissedPatternsView />} />
        <Route path="/lab/calc-groups" element={<CalcGroupsLabView />} />
        <Route path="/lab/star-schema" element={<StarSchemaLabView />} />
        <Route path="/study/day/:n" element={<DayStudyView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
