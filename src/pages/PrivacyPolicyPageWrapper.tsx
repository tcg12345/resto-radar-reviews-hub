import { useNavigate } from 'react-router-dom';
import PrivacyPolicyPage from './PrivacyPolicyPage';

export default function PrivacyPolicyPageWrapper() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/settings');
  };

  return (
    <PrivacyPolicyPage onBack={handleBack} />
  );
}