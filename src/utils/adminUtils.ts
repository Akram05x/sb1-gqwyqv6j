import { 
  collection, 
  doc, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { awardResolutionBonus } from './pointsSystem';

// Update issue status (admin only)
export const updateIssueStatus = async (issueId: string, newStatus: string, adminUserId: string) => {
  try {
    // Verify admin permissions
    const adminRef = doc(db, 'users', adminUserId);
    const adminDoc = await getDoc(adminRef);
    
    if (!adminDoc.exists() || adminDoc.data().role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get current issue data
    const issueRef = doc(db, 'issues', issueId);
    const issueDoc = await getDoc(issueRef);
    
    if (!issueDoc.exists()) {
      throw new Error('Issue not found');
    }

    const issueData = issueDoc.data();
    const previousStatus = issueData.status;

    // Update issue status
    await updateDoc(issueRef, {
      status: newStatus,
      updated_at: serverTimestamp()
    });

    // Award bonus points if issue is resolved and has a user
    if (newStatus === 'resolved' && previousStatus !== 'resolved' && issueData.user_id) {
      await awardResolutionBonus(issueData.user_id, issueId);
    }

    console.log(`✅ Issue ${issueId} status updated to ${newStatus} by admin ${adminUserId}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating issue status:', error);
    throw error;
  }
};

// Get all issues for admin dashboard
export const getAllIssuesForAdmin = async (adminUserId: string) => {
  try {
    // Verify admin permissions
    const adminRef = doc(db, 'users', adminUserId);
    const adminDoc = await getDoc(adminRef);
    
    if (!adminDoc.exists() || adminDoc.data().role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const issuesRef = collection(db, 'issues');
    const snapshot = await getDocs(issuesRef);
    
    const issues = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate() || new Date(),
      updated_at: doc.data().updated_at?.toDate() || new Date()
    }));

    // Sort by creation date (newest first)
    issues.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    return issues;
  } catch (error) {
    console.error('❌ Error fetching issues for admin:', error);
    throw error;
  }
};

// Get admin dashboard statistics
export const getAdminStats = async (adminUserId: string) => {
  try {
    // Verify admin permissions
    const adminRef = doc(db, 'users', adminUserId);
    const adminDoc = await getDoc(adminRef);
    
    if (!adminDoc.exists() || adminDoc.data().role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get all issues
    const issuesSnapshot = await getDocs(collection(db, 'issues'));
    const issues = issuesSnapshot.docs.map(doc => doc.data());

    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => doc.data());

    // Get all redemptions
    const redemptionsSnapshot = await getDocs(collection(db, 'redemptions'));
    const redemptions = redemptionsSnapshot.docs.map(doc => doc.data());

    // Calculate statistics
    const stats = {
      totalIssues: issues.length,
      newIssues: issues.filter(i => i.status === 'new').length,
      acknowledgedIssues: issues.filter(i => i.status === 'acknowledged').length,
      inProgressIssues: issues.filter(i => i.status === 'in_progress').length,
      resolvedIssues: issues.filter(i => i.status === 'resolved').length,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.points_balance > 0).length,
      totalRedemptions: redemptions.length,
      issuesByType: {
        pothole: issues.filter(i => i.type === 'pothole').length,
        streetlight: issues.filter(i => i.type === 'streetlight').length,
        graffiti: issues.filter(i => i.type === 'graffiti').length,
        garbage: issues.filter(i => i.type === 'garbage').length,
        other: issues.filter(i => i.type === 'other').length
      },
      anonymousReports: issues.filter(i => !i.user_id).length,
      authenticatedReports: issues.filter(i => i.user_id).length
    };

    return stats;
  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    throw error;
  }
};

// Bulk update issue statuses (admin utility)
export const bulkUpdateIssueStatus = async (issueIds: string[], newStatus: string, adminUserId: string) => {
  try {
    // Verify admin permissions
    const adminRef = doc(db, 'users', adminUserId);
    const adminDoc = await getDoc(adminRef);
    
    if (!adminDoc.exists() || adminDoc.data().role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const updatePromises = issueIds.map(issueId => 
      updateIssueStatus(issueId, newStatus, adminUserId)
    );

    await Promise.all(updatePromises);
    
    console.log(`✅ Bulk updated ${issueIds.length} issues to status ${newStatus}`);
    return true;
  } catch (error) {
    console.error('❌ Error bulk updating issue statuses:', error);
    throw error;
  }
};