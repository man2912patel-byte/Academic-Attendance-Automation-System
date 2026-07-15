from flask import Blueprint, jsonify
from utils.auth import token_required
from models import AttendanceRun

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard', methods=['GET'])
@dashboard_bp.route('/dashboard/stats', methods=['GET'])
@token_required
def get_dashboard_stats(current_user):
    """Fetches dashboard statistics and recent runs for the logged-in user."""
    try:
        runs = AttendanceRun.query.filter_by(user_id=current_user.id).order_by(AttendanceRun.attendance_date.desc()).all()
        
        total_runs = len(runs)
        total_students = sum(r.total_students for r in runs)
        total_present = sum(r.present_count for r in runs)
        total_absent = sum(r.absent_count for r in runs)
        
        avg_rate = 0.0
        if total_students > 0:
            avg_rate = (total_present / total_students) * 100
            
        recent_runs = []
        for r in runs[:8]:
            pct = (r.present_count / r.total_students * 100) if r.total_students > 0 else 0
            recent_runs.append({
                "id": r.id,
                "date": r.attendance_date.strftime("%Y-%m-%d"),
                "total": r.total_students,
                "present": r.present_count,
                "absent": r.absent_count,
                "rate": round(pct, 1)
            })
            
        recent_runs.reverse()

        return jsonify({
            "overall": {
                "total_runs": total_runs,
                "average_rate": round(avg_rate, 1),
                "total_present": total_present,
                "total_absent": total_absent,
                "total_students": total_students
            },
            "recent_runs": recent_runs
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to fetch dashboard metrics: {str(e)}'}), 500
