import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ExpensesProvider } from './context/ExpensesContext';
import { UserSettingsProvider } from './context/UserSettingsContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExpenseForm from './pages/ExpenseForm';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <UserSettingsProvider>
          <ExpensesProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/add"
                element={
                  <PrivateRoute>
                    <ExpenseForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/edit/:id"
                element={
                  <PrivateRoute>
                    <ExpenseForm />
                  </PrivateRoute>
                }
              />
            </Routes>
          </ExpensesProvider>
        </UserSettingsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
