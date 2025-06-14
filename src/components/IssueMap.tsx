import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, Issue } from '../lib/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function IssueMap() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const issuesRef = collection(db, 'issues');
    const q = query(issuesRef, orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData: Issue[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        issuesData.push({
          id: doc.id,
          user_id: data.user_id,
          type: data.type,
          title: data.title,
          description: data.description,
          image_url: data.image_url,
          location_lat: data.location_lat,
          location_lng: data.location_lng,
          location_address: data.location_address,
          status: data.status,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date()
        });
      });
      setIssues(issuesData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching issues:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'text-red-600';
      case 'acknowledged':
        return 'text-yellow-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'resolved':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 sm:h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-64 sm:h-96 w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={[59.3293, 18.0686]} // Stockholm coordinates
        zoom={12}
        className="h-full w-full"
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {issues.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.location_lat, issue.location_lng]}
          >
            <Popup maxWidth={300} className="custom-popup">
              <div className="p-2 min-w-48 max-w-64">
                <h3 className="font-semibold text-base mb-2 line-clamp-2">{issue.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-3">{issue.description}</p>
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      {t(issue.type as any)}
                    </span>
                    <span className={`font-medium ${getStatusColor(issue.status)}`}>
                      {t(issue.status as any)}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {issue.created_at.toLocaleDateString()}
                  </span>
                </div>
                {issue.image_url && (
                  <img
                    src={issue.image_url}
                    alt={issue.title}
                    className="w-full h-24 object-cover rounded mt-2"
                  />
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}