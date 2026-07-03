from datetime import datetime, date
from decimal import Decimal

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, ForeignKey,
    Integer, Numeric, String, Text, ARRAY, func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id             = Column(BigInteger, primary_key=True)
    github_id      = Column(BigInteger, unique=True, nullable=False)
    login          = Column(String(255), unique=True, nullable=False)
    name           = Column(String(255))
    avatar_url     = Column(Text)
    description    = Column(Text)
    public_repos   = Column(Integer, default=0)
    followers      = Column(Integer, default=0)
    github_created = Column(DateTime(timezone=True))
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    repositories   = relationship("Repository", back_populates="org")


class TechnologyCategory(Base):
    __tablename__ = "technology_categories"

    id            = Column(Integer, primary_key=True)
    name          = Column(String(100), unique=True, nullable=False)
    slug          = Column(String(100), unique=True, nullable=False)
    description   = Column(Text)
    keywords      = Column(ARRAY(Text), default=[])
    github_topics = Column(ARRAY(Text), default=[])
    icon          = Column(String(50))
    color_hex     = Column(String(7))
    parent_id     = Column(Integer, ForeignKey("technology_categories.id"))
    sort_order    = Column(Integer, default=0)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    repos         = relationship("RepositoryCategory", back_populates="category")
    snapshots     = relationship("TrendSnapshot", back_populates="category")
    parent        = relationship("TechnologyCategory", remote_side="TechnologyCategory.id")


class Repository(Base):
    __tablename__ = "repositories"

    id                 = Column(BigInteger, primary_key=True)
    github_id          = Column(BigInteger, unique=True, nullable=False)
    owner              = Column(String(255), nullable=False)
    name               = Column(String(255), nullable=False)
    full_name          = Column(String(511), unique=True, nullable=False)
    description        = Column(Text)
    language           = Column(String(100))
    license            = Column(String(100))
    topics             = Column(ARRAY(Text), default=[])
    homepage_url       = Column(Text)
    default_branch     = Column(String(100), default="main")
    is_archived        = Column(Boolean, default=False)
    is_fork            = Column(Boolean, default=False)
    is_template        = Column(Boolean, default=False)
    open_graph_url     = Column(Text)
    github_created_at  = Column(DateTime(timezone=True))
    github_updated_at  = Column(DateTime(timezone=True))
    github_pushed_at   = Column(DateTime(timezone=True))
    first_seen_at      = Column(DateTime(timezone=True), server_default=func.now())
    last_synced_at     = Column(DateTime(timezone=True))
    # Cached latest values (denormalized for fast listing)
    latest_stars       = Column(Integer, default=0)
    latest_forks       = Column(Integer, default=0)
    latest_watchers    = Column(Integer, default=0)
    stars_gained_today = Column(Integer, default=0)
    stars_gained_week  = Column(Integer, default=0)
    momentum_score     = Column(Numeric(5, 2), default=0)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    org_id             = Column(BigInteger, ForeignKey("organizations.id"))

    org            = relationship("Organization", back_populates="repositories")
    daily_metrics  = relationship("DailyMetric", back_populates="repository", cascade="all, delete-orphan")
    weekly_metrics = relationship("WeeklyMetric", back_populates="repository", cascade="all, delete-orphan")
    categories     = relationship("RepositoryCategory", back_populates="repository", cascade="all, delete-orphan")
    insights       = relationship("InsightReport", back_populates="repository")


class RepositoryCategory(Base):
    __tablename__ = "repository_categories"

    repository_id = Column(BigInteger, ForeignKey("repositories.id", ondelete="CASCADE"), primary_key=True)
    category_id   = Column(Integer, ForeignKey("technology_categories.id", ondelete="CASCADE"), primary_key=True)
    confidence    = Column(Numeric(3, 2), default=1.0)
    tagged_by     = Column(String(20), default="auto")

    repository    = relationship("Repository", back_populates="categories")
    category      = relationship("TechnologyCategory", back_populates="repos")


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id                 = Column(BigInteger, primary_key=True)
    repository_id      = Column(BigInteger, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    date               = Column(Date, nullable=False)
    stars_total        = Column(Integer, nullable=False, default=0)
    forks_total        = Column(Integer, nullable=False, default=0)
    watchers           = Column(Integer, nullable=False, default=0)
    open_issues        = Column(Integer, nullable=False, default=0)
    stars_gained       = Column(Integer, nullable=False, default=0)
    forks_gained       = Column(Integer, nullable=False, default=0)
    contributors_count = Column(Integer, default=0)
    commit_count_week  = Column(Integer, default=0)
    releases_count     = Column(Integer, default=0)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())

    repository = relationship("Repository", back_populates="daily_metrics")


class WeeklyMetric(Base):
    __tablename__ = "weekly_metrics"

    id                 = Column(BigInteger, primary_key=True)
    repository_id      = Column(BigInteger, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    week_start         = Column(Date, nullable=False)
    stars_gained       = Column(Integer, nullable=False, default=0)
    forks_gained       = Column(Integer, nullable=False, default=0)
    new_contributors   = Column(Integer, default=0)
    commit_activity    = Column(Integer, default=0)
    issues_opened      = Column(Integer, default=0)
    pr_count           = Column(Integer, default=0)
    momentum_score     = Column(Numeric(5, 2), default=0)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())

    repository = relationship("Repository", back_populates="weekly_metrics")


class TrendSnapshot(Base):
    __tablename__ = "trend_snapshots"

    id                 = Column(BigInteger, primary_key=True)
    category_id        = Column(Integer, ForeignKey("technology_categories.id", ondelete="CASCADE"), nullable=False)
    date               = Column(Date, nullable=False)
    total_stars        = Column(BigInteger, default=0)
    repo_count         = Column(Integer, default=0)
    stars_gained_week  = Column(Integer, default=0)
    stars_gained_month = Column(Integer, default=0)
    contributor_count  = Column(Integer, default=0)
    momentum_score     = Column(Numeric(5, 2), default=0)
    radar_status       = Column(String(20), default="stable")
    created_at         = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("TechnologyCategory", back_populates="snapshots")


class InsightReport(Base):
    __tablename__ = "insight_reports"

    id              = Column(BigInteger, primary_key=True)
    report_type     = Column(String(30), nullable=False)
    subject_id      = Column(BigInteger, ForeignKey("repositories.id"))
    period_start    = Column(Date)
    period_end      = Column(Date)
    title           = Column(Text)
    summary         = Column(Text)
    why_growing     = Column(Text)
    what_it_solves  = Column(Text)
    who_uses_it     = Column(Text)
    tech_stack      = Column(Text)
    verdict         = Column(Text)
    competitors     = Column(Text)  # JSON string
    tags            = Column(ARRAY(Text), default=[])
    model_used      = Column(String(100))
    tokens_used     = Column(Integer)
    generated_at    = Column(DateTime(timezone=True), server_default=func.now())
    expires_at      = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    repository = relationship("Repository", back_populates="insights")
