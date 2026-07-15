from flask import Blueprint, jsonify
from app.auth import token_required
from app.utils.db_helpers import get_db_connection

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    """Fetches dashboard statistics and recent runs for the logged-in user."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Fetch overall aggregates
        cursor.execute(f"""
            SELECT 
                COUNT(*) as total_runs,
                COALESCE(SUM(total_students), 0) as total_students,
                COALESCE(SUM(present_count), 0) as total_present,
                COALESCE(SUM(absent_count), 0) as total_absent
            FROM history_{current_user.username}
        """)
        agg = cursor.fetchone()
        
        total_runs = agg['total_runs']
        overall_students = agg['total_students']
        overall_present = agg['total_present']
        overall_absent = agg['total_absent']
        
        avg_rate = 0.0
        if overall_students > 0:
            avg_rate = (overall_present / overall_students) * 100
            
        # 2. Fetch last 8 runs for line charts & logs
        cursor.execute(f"""
            SELECT id, attendance_date, total_students, present_count, absent_count
            FROM history_{current_user.username}
            ORDER BY attendance_date DESC
            LIMIT 8
        """)
        rows = cursor.fetchall()
        conn.close()
        
        recent_runs = []
        for r in rows:
            pct = (r['present_count'] / r['total_students'] * 100) if r['total_students'] > 0 else 0
            recent_runs.append({
                "id": r['id'],
                "date": r['attendance_date'],
                "total": r['total_students'],
                "present": r['present_count'],
                "absent": r['absent_count'],
                "rate": round(pct, 1)
            })
            
        # Reverse to read chronologically left-to-right
        recent_runs.reverse()

        return jsonify({
            "overall": {
                "total_runs": total_runs,
                "average_rate": round(avg_rate, 1),
                "total_present": overall_present,
                "total_absent": overall_absent,
                "total_students": overall_students
            },
            "recent_runs": recent_runs
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch dashboard metrics: {str(e)}'}), 500
