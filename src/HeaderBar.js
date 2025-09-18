import React, { useMemo, useState } from 'react';
import EventSelector from './EventSelector';
import { useTenant } from './TenantContext';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import ListItemIcon from '@mui/material/ListItemIcon';
import HelpOutline from '@mui/icons-material/HelpOutline';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';

export default function HeaderBar({ onLogout, onToggleSidebar }) {
  const { currentUser } = useTenant();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const initials = useMemo(() => {
    const name = currentUser?.displayName || currentUser?.email || 'U';
    const core = String(name).split('@')[0];
    const parts = core.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [currentUser]);

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  return (
    <AppBar position="sticky" elevation={0} color="default">
      <Toolbar sx={{ gap: 2 }}>
        {typeof onToggleSidebar === 'function' && (
          <IconButton edge="start" aria-label="open drawer" onClick={onToggleSidebar} sx={{ display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
        )}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <Typography variant="h3" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 700 }}>
            Admin
          </Typography>
          <Box sx={{ minWidth: { xs: 0, sm: 220 }, flex: { xs: 1, sm: 'initial' } }}>
            <EventSelector />
          </Box>
        </Box>
        <Box>
          <Tooltip title={currentUser?.email || ''}>
            <IconButton onClick={handleOpenMenu} size="small" sx={{ p: 0 }} aria-controls={open ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={open ? 'true' : undefined}>
              <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>{initials}</Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleCloseMenu}
            onClick={handleCloseMenu}
            PaperProps={{
              elevation: 0,
              sx: {
                mt: 1.5,
                overflow: 'visible',
                filter: 'drop-shadow(0px 1px 3px rgba(16,24,40,0.10))',
                border: '1px solid #e2e8f0',
                '& .MuiAvatar-root': {
                  width: 28,
                  height: 28,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 16,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                  borderLeft: '1px solid #e2e8f0',
                  borderTop: '1px solid #e2e8f0',
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disableRipple sx={{ cursor: 'default' }}>
              <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700 }}>{initials}</Avatar>
              <Box sx={{ ml: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {currentUser?.displayName || 'Authenticated User'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {currentUser?.email}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem>
              <ListItemIcon>
                <HelpOutline fontSize="small" />
              </ListItemIcon>
              Help & Support
            </MenuItem>
            <MenuItem>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => onLogout && onLogout()}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
