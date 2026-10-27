from django.urls import path

from . import views

urlpatterns = [
    path('', views.JobListCreateView.as_view(), name='job-list'),
    path('mine/', views.MyJobsView.as_view(), name='job-mine'),
    path('<int:pk>/', views.JobDetailView.as_view(), name='job-detail'),
    path('<int:pk>/manage/', views.JobManageView.as_view(), name='job-manage'),
    path('<int:pk>/apply/', views.JobApplyView.as_view(), name='job-apply'),
    path('<int:pk>/applications/', views.JobApplicationsView.as_view(), name='job-applications'),
    path('<int:pk>/fee-status/', views.JobFeeStatusView.as_view(), name='job-fee-status'),
    path('<int:pk>/fee/retry/', views.JobFeeRetryView.as_view(), name='job-fee-retry'),
]
