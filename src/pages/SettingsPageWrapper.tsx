import { useNavigate } from 'react-router-dom';
import SettingsPage from './SettingsPage';

export default function SettingsPageWrapper() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/home');
  };

  return (
    <SettingsPage onBack={handleBack} />
  );
}