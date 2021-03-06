require "voltron/version"
require "voltron/config"
require "voltron/asset"
require "active_support/callbacks"

begin
  require "colorize"
rescue LoadError => e
end

module Voltron
  def self.setup
    yield config
  end

  def self.config
    @config ||= Voltron::Config.new
  end

  def self.asset
    @asset ||= Voltron::Asset.new
  end

  def self.log(message, tag, color = nil)
    @logger ||= ActiveSupport::TaggedLogging.new(config.logger)
    if config.debug
      msg = "[Voltron] [#{tag}] #{message}"
      if !color.nil? && msg.respond_to?(color)
        puts msg.send color
      else
        puts msg
      end
    end
    @logger.tagged(Time.now.strftime("%Y-%m-%d %I:%M:%S %Z")) { @logger.tagged("Voltron") { @logger.tagged(tag) { @logger.info message } } }
  end
end

require "voltron/engine" if defined?(Rails)