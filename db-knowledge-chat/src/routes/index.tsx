import { useRoutes, Navigate } from 'react-router-dom';
import DBCChat from '../pages/chat/DBCChat';
import { PATHS } from './paths';

// Component จัดการ Route ทั้งหมด
export default function Router() {
  return useRoutes([
    {
      path: PATHS.CHAT,
      element: <DBCChat />,
    }
  ]);
}
