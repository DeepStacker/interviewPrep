import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Brain, LogOut, Settings } from 'lucide-react';
import styles from './Navigation.module.css';

interface NavigationProps {
  onLogout?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onLogout }) => {
  const { user } = useAuthStore();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/dashboard" className={styles.logo}>
          <Brain size={24} />
          <span>InterviewAI</span>
        </Link>

        <div className={styles.centerMenu}>
          <Link to="/dashboard" className={styles.navLink}>
            Dashboard
          </Link>
          <Link to="/setup" className={styles.navLink}>
            Start Interview
          </Link>
          {user?.isAdmin && (
            <Link to="/admin" className={styles.navLink}>
              Admin
            </Link>
          )}
        </div>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            {user?.picture && <img src={user.picture} alt={user.name} />}
            <span>{user?.name}</span>
          </div>
          <button className={styles.logoutBtn} onClick={onLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
