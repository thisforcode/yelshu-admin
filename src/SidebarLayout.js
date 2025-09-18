import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import QrCode2Outlined from '@mui/icons-material/QrCode2Outlined';
import logo from './assets/logo.jpeg';
import HeaderBar from './HeaderBar';

const drawerWidth = 260;

export default function SidebarLayout({ onLogout }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the sidebar on route change (useful for mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <HomeOutlined /> },
    { to: '/events', label: 'Events', icon: <EventOutlined /> },
    { to: '/users', label: 'Users', icon: <GroupOutlined /> },
    { to: '/bulk-qr-generator', label: 'Bulk QR Generator', icon: <QrCode2Outlined /> },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Divider />
      <List sx={{ px: 1, pt: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <ListItem key={item.to} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={item.to}
                selected={active}
              >
                <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 2, color: 'text.secondary', fontSize: 12 }}>© {new Date().getFullYear()}</Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar */}
      {onLogout && (
        <Box sx={{ position: 'fixed', top: 0, left: { xs: 0, md: `${drawerWidth}px` }, right: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <HeaderBar onLogout={onLogout} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        </Box>
      )}

      {/* Permanent drawer on md+ */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        open
      >
        {/* Add a toolbar spacer to offset AppBar height only when AppBar is rendered */}
        {onLogout ? (
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <img src={logo} alt="Logo" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>Yelshu Admin</Typography>
            </Box>
          </Toolbar>
        ) : (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <img src={logo} alt="Logo" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
            <Typography variant="h3" sx={{ fontWeight: 700 }}>Yelshu Admin</Typography>
          </Box>
        )}
        {drawer}
      </Drawer>

      {/* Temporary drawer on xs-sm */}
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        {/* For temporary drawer, the logo header is part of the content */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <img src={logo} alt="Logo" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
          <Typography variant="h3" sx={{ fontWeight: 700 }}>Yelshu Admin</Typography>
        </Box>
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}