import pytest
from unittest.mock import Mock
from app.services.scheduler_service import SchedulerService

@pytest.mark.asyncio
async def test_scheduler_initialization():
    """Test inicializar scheduler"""

    mock_db = Mock()
    mock_ai = Mock()
    mock_email = Mock()

    scheduler = SchedulerService(mock_db, mock_ai, mock_email)

    assert scheduler.scheduler is not None
    assert scheduler.db is not None

def test_scheduler_add_jobs():
    """Test agregar jobs"""

    mock_db = Mock()
    mock_ai = Mock()
    mock_email = Mock()

    scheduler = SchedulerService(mock_db, mock_ai, mock_email)
    scheduler.add_jobs()

    jobs = scheduler.scheduler.get_jobs()
    assert len(jobs) == 4
    assert any(job.id == 'check_aging_deals' for job in jobs)
    assert any(job.id == 'analyze_deals_with_ai' for job in jobs)
    assert any(job.id == 'weekly_report' for job in jobs)
    assert any(job.id == 'cleanup_old_data' for job in jobs)
